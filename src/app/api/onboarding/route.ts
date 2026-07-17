import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, onboardingSubmissions, projectPhases, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { projectPhaseNames } from "@/lib/services";
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
  website: z.string().url().max(2048).optional().or(z.literal("")),
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

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

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
      website,
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
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
