import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, onboardingSubmissions, projectPhases, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { projectPhaseNames } from "@/lib/services";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isGhlConfigured,
  syncContactToGhl,
  createGhlOpportunity,
} from "@/lib/ghl";
import { z } from "zod";

const onboardingSchema = z.object({
  businessName: z.string().min(1).max(255),
  industry: z.string().max(255).optional(),
  // Accept bare domains ("acme.com") — the client collects a plain domain, so
  // don't demand a scheme here; we normalize to a full URL before storing.
  website: z.string().max(2048).optional(),
  description: z.string().max(5000).optional(),
  targetAudience: z.string().max(2000).optional(),
  timeline: z.string().max(100).optional(),
  budget: z.string().max(100).optional(),
  additionalNotes: z.string().max(5000).optional(),
  brandColors: z.string().max(500).optional(),
  features: z.array(z.string().max(255)).max(50).optional(),
  serviceType: z.enum([
    "paid_advertising",
    "funnel_build",
    "website_design",
    "crm_automation",
  ]),
});

/**
 * Get the DB user, self-healing the signup race: a brand-new account can land
 * here before the Clerk user.created webhook has inserted their row. In that
 * case, create the row from the live Clerk session instead of failing.
 */
async function getOrCreateDbUser() {
  try {
    return await getAuthenticatedUser();
  } catch (error) {
    if (!(error instanceof NextResponse) || error.status !== 404) throw error;

    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [created] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        role: "client",
      })
      .onConflictDoNothing({ target: users.clerkId })
      .returning();

    // onConflictDoNothing returns nothing if the webhook won the race — fetch.
    return created ?? (await getAuthenticatedUser());
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDbUser();

    const rateLimit = checkRateLimit(user.id + ":onboarding", 5);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const {
      serviceType,
      businessName,
      industry,
      website,
      description,
      targetAudience,
      timeline,
      budget,
      brandColors,
      additionalNotes,
    } = parsed.data;

    // Normalize a bare domain to a full URL so stored links are clickable.
    const normalizedWebsite =
      website && website.trim() !== ""
        ? /^https?:\/\//i.test(website.trim())
          ? website.trim()
          : `https://${website.trim()}`
        : website;

    // Create project
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: businessName,
        serviceType,
        status: "onboarding",
      })
      .returning();

    // Create onboarding submission
    await db.insert(onboardingSubmissions).values({
      projectId: project.id,
      businessName,
      industry,
      website: normalizedWebsite,
      description,
      targetAudience,
      timeline,
      budget,
      brandColors,
      additionalNotes,
    });

    // Create default phases (batch insert)
    await db.insert(projectPhases).values(
      projectPhaseNames.map((name, i) => ({
        projectId: project.id,
        name,
        order: i,
        status: "pending" as const,
      }))
    );

    // GHL is the agency's pipeline of record — mirror the new project as an
    // opportunity on the client's GHL contact. Best-effort: never fail the
    // onboarding submission over a CRM hiccup.
    if (isGhlConfigured()) {
      try {
        let ghlContactId = user.ghlContactId;
        if (!ghlContactId) {
          ghlContactId = await syncContactToGhl({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: businessName,
            tags: ["client-portal"],
            source: "client_portal_onboarding",
          });
          await db
            .update(users)
            .set({ ghlContactId, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }

        const ghlOpportunityId = await createGhlOpportunity({
          name: `${businessName} — ${serviceType.replace(/_/g, " ")}`,
          contactId: ghlContactId,
        });
        await db
          .update(projects)
          .set({ ghlOpportunityId, updatedAt: new Date() })
          .where(eq(projects.id, project.id));
      } catch (ghlError) {
        console.error(
          "GHL opportunity sync failed (project still created):",
          ghlError
        );
      }
    }

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Onboarding error:", error);
    return NextResponse.json(
      {
        error: "Failed to create project",
        // Temporary: surface the real cause so submission failures are
        // diagnosable in the client. Safe to trim back once stable.
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
