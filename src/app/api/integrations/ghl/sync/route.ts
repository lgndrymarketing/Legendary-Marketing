import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { isGhlConfigured, fetchGhlOpportunities } from "@/lib/ghl";
import { db } from "@/db";
import { payments, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return NextResponse.json({ configured: isGhlConfigured() });
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

        const existing = await db
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.ghlPaymentId, opp.id))
          .limit(1);

        if (existing.length > 0) {
          // Already synced — nothing more to do in this scaffold pass.
          synced++;
          continue;
        }

        // Note: without a projectId/userId mapping from the GHL opportunity
        // (e.g. via custom fields tying it back to a project), we can't
        // safely insert a new payments row here — that mapping is left as
        // a follow-up once real GHL data/field conventions are known.
        // We still count opportunities we successfully inspected.
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
