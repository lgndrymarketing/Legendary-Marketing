import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyticsEvents, adCampaigns, projects } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";

/**
 * GET /api/analytics/summary — the signed-in client's performance rollup
 * across all their campaigns: total leads, ad spend, tracked revenue, CPL,
 * ROAS, and 8 trailing weekly series.
 *
 * Metric conventions (agency-recorded via POST /api/analytics):
 *   event "lead"    — value = lead count (default 1)
 *   event "spend"   — value = ad spend in cents
 *   event "revenue" — value = attributed revenue in cents
 * When a client has no events yet, totals fall back to the per-campaign
 * counters on ad_campaigns (flat series).
 */

const WEEKS = 8;

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.userId, user.id));
    const ids = owned.map((p) => p.id);

    if (ids.length === 0) {
      return NextResponse.json({ empty: true });
    }

    const [events, campaigns] = await Promise.all([
      db
        .select({
          event: analyticsEvents.event,
          value: analyticsEvents.value,
          createdAt: analyticsEvents.createdAt,
        })
        .from(analyticsEvents)
        .where(inArray(analyticsEvents.projectId, ids))
        .limit(5000),
      db
        .select({
          totalSpend: adCampaigns.totalSpend,
          leadsGenerated: adCampaigns.leadsGenerated,
        })
        .from(adCampaigns)
        .where(inArray(adCampaigns.projectId, ids)),
    ]);

    // Trailing week buckets, oldest → newest (weeks start Monday UTC).
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - ((day + 6) % 7)
      )
    );
    const weekStarts = Array.from({ length: WEEKS }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() - (WEEKS - 1 - i) * 7);
      return d;
    });
    const weekIndex = (date: Date) => {
      for (let i = WEEKS - 1; i >= 0; i--) {
        if (date >= weekStarts[i]) return i;
      }
      return -1;
    };
    const labels = weekStarts.map((d) =>
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    );

    const leadsSeries = Array(WEEKS).fill(0);
    const spendSeries = Array(WEEKS).fill(0);
    const revenueSeries = Array(WEEKS).fill(0);
    let totalLeads = 0;
    let totalSpend = 0;
    let totalRevenue = 0;

    const kind = (e: string) => {
      const n = e.toLowerCase();
      if (n === "lead" || n === "leads") return "lead";
      if (n === "spend" || n === "ad_spend") return "spend";
      if (n === "revenue" || n === "sale") return "revenue";
      return null;
    };

    for (const e of events) {
      const k = kind(e.event);
      if (!k) continue;
      const v = e.value ?? (k === "lead" ? 1 : 0);
      const i = weekIndex(new Date(e.createdAt));
      if (k === "lead") {
        totalLeads += v;
        if (i >= 0) leadsSeries[i] += v;
      } else if (k === "spend") {
        totalSpend += v;
        if (i >= 0) spendSeries[i] += v;
      } else {
        totalRevenue += v;
        if (i >= 0) revenueSeries[i] += v;
      }
    }

    // Fallback to campaign counters when no events are tracked yet.
    if (totalLeads === 0 && totalSpend === 0 && totalRevenue === 0) {
      totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
      totalSpend = campaigns.reduce((s, c) => s + c.totalSpend, 0);
    }

    const cplSeries = leadsSeries.map((l, i) =>
      l > 0 ? Math.round(spendSeries[i] / l) : 0
    );
    const roasSeries = spendSeries.map((sp, i) =>
      sp > 0 ? Math.round((revenueSeries[i] / sp) * 100) / 100 : 0
    );

    return NextResponse.json({
      totals: {
        totalLeads,
        totalSpend,
        totalRevenue,
        avgCpl: totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0,
        avgRoas:
          totalSpend > 0
            ? Math.round((totalRevenue / totalSpend) * 100) / 100
            : 0,
      },
      weeks: labels,
      series: {
        leads: leadsSeries,
        cpl: cplSeries,
        roas: roasSeries,
      },
      hasData: totalLeads > 0 || totalSpend > 0 || totalRevenue > 0,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
