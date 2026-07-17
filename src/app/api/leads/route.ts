import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { isGhlConfigured, syncContactToGhl } from "@/lib/ghl";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { canManageLeads } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

/** Require the caller to be allowed to view/triage leads (admin or PM). */
async function requireLeadManager() {
  const user = await getAuthenticatedUser();
  if (!canManageLeads(user.role)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

const leadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  serviceInterest: z.string().max(100).optional(),
  monthlyBudget: z.string().max(100).optional(),
  message: z.string().max(5000).optional(),
  source: z.enum(["contact_form", "get_started_funnel"]),
});

const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;

/**
 * POST /api/leads — PUBLIC lead-capture endpoint (contact form + get-started
 * funnel). Saves the lead locally, then best-effort syncs it to GoHighLevel.
 */
export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateLimit = checkRateLimit(`leads:${ip}`, 10, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, company, serviceInterest, monthlyBudget, message, source } =
      parsed.data;

    const [lead] = await db
      .insert(leads)
      .values({
        name,
        email,
        phone,
        company,
        serviceInterest,
        monthlyBudget,
        message,
        source,
      })
      .returning();

    // Best-effort GHL sync — the lead is already saved locally, so a CRM
    // failure must never fail the request.
    if (isGhlConfigured()) {
      try {
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const ghlContactId = await syncContactToGhl({
          email,
          firstName,
          lastName: rest.join(" ") || null,
          phone: phone ?? null,
          companyName: company ?? null,
          tags: ["website-lead", source.replace(/_/g, "-")],
          source,
        });
        await db
          .update(leads)
          .set({ ghlContactId, ghlSyncedAt: new Date() })
          .where(eq(leads.id, lead.id));
      } catch (ghlError) {
        console.error("GHL lead sync failed:", ghlError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads — staff-only leads inbox feed. Optional ?status= filter.
 */
export async function GET(req: Request) {
  try {
    await requireLeadManager();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const statusFilter =
      status && (leadStatuses as readonly string[]).includes(status)
        ? eq(leads.status, status as (typeof leadStatuses)[number])
        : undefined;

    const rows = await db
      .select()
      .from(leads)
      .where(statusFilter)
      .orderBy(desc(leads.createdAt))
      .limit(200);

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Leads fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(leadStatuses),
});

/**
 * PATCH /api/leads — staff-only lead status update.
 */
export async function PATCH(req: Request) {
  try {
    await requireLeadManager();

    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(leads)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(leads.id, parsed.data.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Lead update error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}
