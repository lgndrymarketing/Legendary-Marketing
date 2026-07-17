import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { isGhlConfigured, fetchGhlOpportunities } from "@/lib/ghl";
import { db } from "@/db";
import { payments, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Config state is admin-only — don't leak integration posture to
    // unauthenticated callers or non-admin staff.
    await requireAdmin();
    return NextResponse.json({ configured: isGhlConfigured() });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdmin();

    if (!isGhlConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          message:
            "GoHighLevel is not configured. Set GHL_API_KEY and GHL_LOCATION_ID.",
        },
        { status: 200 }
      );
    }

    let opportunities;
    try {
      opportunities = await fetchGhlOpportunities();
    } catch (error) {
      console.error("GHL sync: failed to fetch opportunities", error);
      return NextResponse.json(
        {
          configured: true,
          synced: 0,
          errors: [
            error instanceof Error ? error.message : "Failed to fetch opportunities",
          ],
        },
        { status: 200 }
      );
    }

    let synced = 0;
    const errors: string[] = [];

    for (const opp of opportunities) {
      try {
        if (!opp.id) continue;

        // Match the opportunity back to a project via projects.ghlOpportunityId.
        // Opportunities with no matching project (not yet linked from our
        // side) are skipped rather than guessed at.
        const [project] = await db
          .select({ id: projects.id, userId: projects.userId })
          .from(projects)
          .where(eq(projects.ghlOpportunityId, opp.id))
          .limit(1);

        if (!project) {
          continue;
        }

        const existing = await db
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.ghlPaymentId, opp.id))
          .limit(1);

        const status = opp.status === "won" ? "completed" : "pending";
        const amount = Math.round(opp.monetaryValue ?? 0);

        if (existing.length > 0) {
          await db
            .update(payments)
            .set({ status, amount, updatedAt: new Date() })
            .where(eq(payments.ghlPaymentId, opp.id));
        } else {
          await db.insert(payments).values({
            projectId: project.id,
            userId: project.userId,
            amount,
            status,
            source: "ghl",
            ghlPaymentId: opp.id,
          });
        }

        synced++;
      } catch (itemError) {
        console.error("GHL sync: failed to process opportunity", opp?.id, itemError);
        errors.push(
          `Opportunity ${opp?.id ?? "unknown"}: ${
            itemError instanceof Error ? itemError.message : "unknown error"
          }`
        );
      }
    }

    return NextResponse.json({ configured: true, synced, errors });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GHL sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
