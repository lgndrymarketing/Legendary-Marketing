import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, projects, payments, expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { getPricing } from "@/lib/pricing";

/**
 * GET /api/admin/metrics — the Financials command center. Admin-only (this is
 * agency P&L: revenue, costs, margin, MRR/ARR, LTV, churn).
 *
 * Row volumes are agency-sized (hundreds, not millions), so rows are pulled
 * once and aggregated in JS — one pass beats seven aggregate round-trips and
 * keeps every metric internally consistent with the same snapshot.
 *
 * All money values are cents.
 */

const MONTHS_SHOWN = 6;

/** "YYYY-MM" bucket key for a date. */
const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Short label like "Feb 2026". */
const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export async function GET() {
  try {
    await requireAdmin();

    const [paymentRows, expenseRows, projectRows, clientRows] =
      await Promise.all([
        db
          .select({
            amount: payments.amount,
            status: payments.status,
            userId: payments.userId,
            createdAt: payments.createdAt,
          })
          .from(payments),
        db
          .select({
            amount: expenses.amount,
            cadence: expenses.cadence,
            category: expenses.category,
            incurredAt: expenses.incurredAt,
          })
          .from(expenses),
        db
          .select({
            serviceType: projects.serviceType,
            status: projects.status,
            userId: projects.userId,
            createdAt: projects.createdAt,
          })
          .from(projects),
        db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.role, "client")),
      ]);

    // Trailing month buckets, oldest → newest, current month last.
    const now = new Date();
    const buckets = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const d = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - (MONTHS_SHOWN - 1 - i),
          1
        )
      );
      return { key: monthKey(d), label: monthLabel(d), start: d };
    });
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    const windowStart = buckets[0].start;
    const zeros = () => buckets.map(() => 0);

    // Revenue — completed payments only.
    const completed = paymentRows.filter((p) => p.status === "completed");
    const totalRevenue = completed.reduce((s, p) => s + p.amount, 0);
    const revenueSeries = zeros();
    for (const p of completed) {
      const i = bucketIndex.get(monthKey(new Date(p.createdAt)));
      if (i !== undefined) revenueSeries[i] += p.amount;
    }

    // Costs — one-time expenses land in their month; monthly expenses recur
    // every month from incurredAt onward.
    const costsSeries = zeros();
    let totalCosts = 0;
    for (const e of expenseRows) {
      const incurred = new Date(e.incurredAt);
      if (e.cadence === "one_time") {
        totalCosts += e.amount;
        const i = bucketIndex.get(monthKey(incurred));
        if (i !== undefined) costsSeries[i] += e.amount;
      } else {
        // Months elapsed since incurred (inclusive of the current month).
        const elapsed =
          (now.getUTCFullYear() - incurred.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - incurred.getUTCMonth()) +
          1;
        totalCosts += e.amount * Math.max(elapsed, 1);
        buckets.forEach((b, i) => {
          if (b.start >= new Date(Date.UTC(incurred.getUTCFullYear(), incurred.getUTCMonth(), 1)))
            costsSeries[i] += e.amount;
        });
      }
    }

    const monthlyRecurringCosts = expenseRows
      .filter((e) => e.cadence === "monthly")
      .reduce((s, e) => s + e.amount, 0);

    const profitSeries = revenueSeries.map((r, i) => r - costsSeries[i]);
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    // MRR — monthly-billing services on projects that are still live. The
    // trend approximates history: a project contributes from its creation
    // month onward (cancellation dates aren't tracked).
    const liveStatuses = new Set(["onboarding", "payment_pending", "in_progress", "revision"]);
    const mrrSeries = zeros();
    let mrr = 0;
    for (const p of projectRows) {
      const pricing = getPricing(p.serviceType);
      if (!pricing || pricing.billing !== "monthly") continue;
      if (p.status === "cancelled") continue;
      const isLive = liveStatuses.has(p.status);
      if (isLive) mrr += pricing.amountCents;
      const created = new Date(p.createdAt);
      buckets.forEach((b, i) => {
        const afterCreation =
          b.start >=
            new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), 1));
        // Completed projects stop contributing to the current MRR but still
        // shape the historical curve up to now only if live; keep it simple:
        // count live projects from creation onward.
        if (afterCreation && isLive) mrrSeries[i] += pricing.amountCents;
      });
    }
    const arr = mrr * 12;
    const arrSeries = mrrSeries.map((v) => v * 12);

    // Clients — active = owns at least one live project.
    const activeClientIds = new Set(
      projectRows.filter((p) => liveStatuses.has(p.status)).map((p) => p.userId)
    );
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const newClientsThisPeriod = clientRows.filter(
      (c) => new Date(c.createdAt) >= thirtyDaysAgo
    ).length;
    const newClientsSeries = zeros();
    for (const c of clientRows) {
      const i = bucketIndex.get(monthKey(new Date(c.createdAt)));
      if (i !== undefined) newClientsSeries[i]++;
    }

    // LTV — recognized revenue per client, avg months retained as caption.
    const avgLtv =
      clientRows.length > 0 ? Math.round(totalRevenue / clientRows.length) : 0;
    const avgMonthsRetained =
      clientRows.length > 0
        ? clientRows.reduce(
            (s, c) =>
              s +
              Math.max(
                0,
                (now.getTime() - new Date(c.createdAt).getTime()) /
                  (30 * 86_400_000)
              ),
            0
          ) / clientRows.length
        : 0;

    // Churn — clients who signed up but have no live projects and at least one
    // cancelled one ("clients lost"), over all clients with projects.
    const clientProjectStatuses = new Map<string, string[]>();
    for (const p of projectRows) {
      const list = clientProjectStatuses.get(p.userId) ?? [];
      list.push(p.status);
      clientProjectStatuses.set(p.userId, list);
    }
    let clientsLost = 0;
    for (const [, statuses] of clientProjectStatuses) {
      const anyLive = statuses.some((s) => liveStatuses.has(s));
      const anyCancelled = statuses.includes("cancelled");
      if (!anyLive && anyCancelled) clientsLost++;
    }
    const clientsWithProjects = clientProjectStatuses.size;
    const churnRate =
      clientsWithProjects > 0 ? clientsLost / clientsWithProjects : 0;

    // Top customers by completed spend.
    const spendByUser = new Map<string, number>();
    for (const p of completed) {
      spendByUser.set(p.userId, (spendByUser.get(p.userId) ?? 0) + p.amount);
    }
    const clientById = new Map(clientRows.map((c) => [c.id, c]));
    const topCustomers = [...spendByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, total]) => {
        const c = clientById.get(userId);
        const name = c
          ? [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
          : "Unknown";
        return { name, total };
      });

    // Packages distribution — live projects by service package.
    const packageCounts = new Map<string, number>();
    for (const p of projectRows) {
      if (!liveStatuses.has(p.status)) continue;
      const label = getPricing(p.serviceType)?.label ?? p.serviceType;
      packageCounts.set(label, (packageCounts.get(label) ?? 0) + 1);
    }
    const packagesDistribution = [...packageCounts.entries()].map(
      ([label, count]) => ({ label, count })
    );

    return NextResponse.json({
      totals: {
        totalRevenue,
        totalCosts,
        monthlyRecurringCosts,
        profitMargin,
        totalProfit,
        mrr,
        arr,
        activeClients: activeClientIds.size,
        newClientsThisPeriod,
        avgLtv,
        avgMonthsRetained,
        churnRate,
        clientsLost,
      },
      months: buckets.map((b) => b.label),
      series: {
        revenue: revenueSeries,
        costs: costsSeries,
        profit: profitSeries,
        mrr: mrrSeries,
        arr: arrSeries,
        newClients: newClientsSeries,
      },
      topCustomers,
      packagesDistribution,
      windowStart: windowStart.toISOString(),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
