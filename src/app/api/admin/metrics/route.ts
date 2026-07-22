import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  payments,
  expenses,
  agencyClients,
  clientPayments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * GET /api/admin/metrics — the Financials command center. Admin-only (this is
 * agency P&L: revenue, costs, margin, MRR/ARR, LTV, churn).
 *
 * Optional `?from=yyyy-mm-dd&to=yyyy-mm-dd` (to inclusive) window the FLOW
 * metrics — revenue, costs, profit, new clients, top customers — and stretch
 * the chart buckets across the window (capped at 24 months). Point-in-time
 * metrics (MRR, ARR, active clients, churn, LTV, monthly burn) always
 * reflect the current roster.
 *
 * Row volumes are agency-sized (hundreds, not millions), so rows are pulled
 * once and aggregated in JS — one pass beats seven aggregate round-trips and
 * keeps every metric internally consistent with the same snapshot.
 *
 * All money values are cents.
 */

const MONTHS_SHOWN = 6;
const MAX_MONTHS = 24;

/** Strict yyyy-mm-dd → UTC midnight, or null. */
function parseDay(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

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

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const params = new URL(req.url).searchParams;
    const fromParam = parseDay(params.get("from"));
    const toParam = parseDay(params.get("to"));
    // Exclusive upper bound: the day after the inclusive `to`.
    const toEx = toParam ? new Date(toParam.getTime() + 86_400_000) : null;
    const windowed = fromParam !== null || toEx !== null;
    const inWindow = (d: Date) =>
      (!fromParam || d >= fromParam) && (!toEx || d < toEx);

    const [
      paymentRows,
      expenseRows,
      clientRows,
      rosterRows,
      collectedRows,
    ] = await Promise.all([
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
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.role, "client")),
        db
          .select({
            package: agencyClients.package,
            monthlyFee: agencyClients.monthlyFee,
            startDate: agencyClients.startDate,
            status: agencyClients.status,
          })
          .from(agencyClients),
        db
          .select({
            amount: clientPayments.amount,
            paidAt: clientPayments.paidAt,
            companyName: agencyClients.companyName,
          })
          .from(clientPayments)
          .leftJoin(
            agencyClients,
            eq(clientPayments.clientId, agencyClients.id)
          ),
      ]);

    // Month buckets, oldest → newest. Default: trailing 6 months ending in
    // the current month. Windowed: span the window's months (capped).
    const now = new Date();
    const lastDay = toParam && toParam < now ? toParam : now;
    const endMonth = { y: lastDay.getUTCFullYear(), m: lastDay.getUTCMonth() };
    let monthsShown = MONTHS_SHOWN;
    if (windowed && fromParam) {
      const span =
        (endMonth.y - fromParam.getUTCFullYear()) * 12 +
        (endMonth.m - fromParam.getUTCMonth()) +
        1;
      monthsShown = Math.min(Math.max(span, 1), MAX_MONTHS);
    }
    const buckets = Array.from({ length: monthsShown }, (_, i) => {
      const d = new Date(
        Date.UTC(endMonth.y, endMonth.m - (monthsShown - 1 - i), 1)
      );
      return { key: monthKey(d), label: monthLabel(d), start: d };
    });
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    const windowStart = buckets[0].start;
    const zeros = () => buckets.map(() => 0);

    // Revenue — completed project payments plus collected client payments
    // (setup fees + retainers recorded on the roster). When a window is
    // active, rows outside it are dropped BEFORE bucketing so mid-month
    // custom ranges stay truthful.
    const completed = paymentRows.filter(
      (p) => p.status === "completed" && (!windowed || inWindow(new Date(p.createdAt)))
    );
    const collected = collectedRows.filter(
      (p) => !windowed || inWindow(new Date(p.paidAt))
    );
    const totalRevenue =
      completed.reduce((s, p) => s + p.amount, 0) +
      collected.reduce((s, p) => s + p.amount, 0);
    const revenueSeries = zeros();
    for (const p of completed) {
      const i = bucketIndex.get(monthKey(new Date(p.createdAt)));
      if (i !== undefined) revenueSeries[i] += p.amount;
    }
    for (const p of collected) {
      const i = bucketIndex.get(monthKey(new Date(p.paidAt)));
      if (i !== undefined) revenueSeries[i] += p.amount;
    }

    // Costs — one-time expenses land in their month; monthly expenses recur
    // every month from incurredAt onward. Windowed totals count recurring
    // expenses once per window month they were live in.
    const costsSeries = zeros();
    let totalCosts = 0;
    for (const e of expenseRows) {
      const incurred = new Date(e.incurredAt);
      if (e.cadence === "one_time") {
        if (windowed && !inWindow(incurred)) continue;
        totalCosts += e.amount;
        const i = bucketIndex.get(monthKey(incurred));
        if (i !== undefined) costsSeries[i] += e.amount;
      } else {
        const incurredMonth = new Date(
          Date.UTC(incurred.getUTCFullYear(), incurred.getUTCMonth(), 1)
        );
        let liveMonths = 0;
        buckets.forEach((b, i) => {
          if (b.start >= incurredMonth) {
            costsSeries[i] += e.amount;
            liveMonths++;
          }
        });
        if (windowed) {
          totalCosts += e.amount * liveMonths;
        } else {
          // Months elapsed since incurred (inclusive of the current month).
          const elapsed =
            (now.getUTCFullYear() - incurred.getUTCFullYear()) * 12 +
            (now.getUTCMonth() - incurred.getUTCMonth()) +
            1;
          totalCosts += e.amount * Math.max(elapsed, 1);
        }
      }
    }

    const monthlyRecurringCosts = expenseRows
      .filter((e) => e.cadence === "monthly")
      .reduce((s, e) => s + e.amount, 0);

    const profitSeries = revenueSeries.map((r, i) => r - costsSeries[i]);
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    // LTV — total collected revenue divided by the number of roster clients
    // (matches the "grand total of all payments / total clients" definition).
    const avgLtv =
      rosterRows.length > 0
        ? Math.round(totalRevenue / rosterRows.length)
        : 0;
    const avgMonthsRetained =
      rosterRows.length > 0
        ? rosterRows.reduce(
            (s, c) =>
              s +
              Math.max(
                0,
                (now.getTime() - new Date(c.startDate).getTime()) /
                  (30 * 86_400_000)
              ),
            0
          ) / rosterRows.length
        : 0;

    // Top customers by completed spend.
    const spendByUser = new Map<string, number>();
    for (const p of completed) {
      spendByUser.set(p.userId, (spendByUser.get(p.userId) ?? 0) + p.amount);
    }
    const clientById = new Map(clientRows.map((c) => [c.id, c]));
    const spendByName = new Map<string, number>();
    for (const [userId, total] of spendByUser) {
      const c = clientById.get(userId);
      const name = c
        ? [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
        : "Unknown";
      spendByName.set(name, (spendByName.get(name) ?? 0) + total);
    }
    for (const p of collected) {
      const name = p.companyName ?? "Unknown";
      spendByName.set(name, (spendByName.get(name) ?? 0) + p.amount);
    }
    const topCustomers = [...spendByName.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    // The agency-client roster is the ONLY source of truth for recurring
    // revenue, package mix, client counts, and churn. No roster rows means
    // zeros — never estimated numbers.
    let finalMrr = 0;
    let finalArr = 0;
    let finalMrrSeries = zeros();
    let finalArrSeries = zeros();
    let finalActiveClients = 0;
    let finalChurnRate = 0;
    let finalClientsLost = 0;
    let finalNewClientsSeries = zeros();
    let finalNewClientsThisPeriod = 0;
    let finalPackages: { label: string; count: number }[] = [];
    if (rosterRows.length > 0) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
      const active = rosterRows.filter((c) => c.status === "active");
      finalMrr = active.reduce((s, c) => s + c.monthlyFee, 0);
      finalArr = finalMrr * 12;
      finalMrrSeries = buckets.map((b) =>
        rosterRows
          .filter((c) => {
            const started = new Date(c.startDate);
            return (
              c.status !== "churned" &&
              b.start >=
                new Date(
                  Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), 1)
                )
            );
          })
          .reduce((s, c) => s + c.monthlyFee, 0)
      );
      finalArrSeries = finalMrrSeries.map((v) => v * 12);
      finalActiveClients = active.length;
      finalClientsLost = rosterRows.filter((c) => c.status === "churned").length;
      finalChurnRate =
        rosterRows.length > 0 ? finalClientsLost / rosterRows.length : 0;
      finalNewClientsSeries = zeros();
      for (const c of rosterRows) {
        const i = bucketIndex.get(monthKey(new Date(c.startDate)));
        if (i !== undefined) finalNewClientsSeries[i]++;
      }
      finalNewClientsThisPeriod = rosterRows.filter(
        (c) => new Date(c.startDate) >= thirtyDaysAgo
      ).length;
      const byPackage = new Map<string, number>();
      for (const c of active) {
        const label = c.package[0].toUpperCase() + c.package.slice(1);
        byPackage.set(label, (byPackage.get(label) ?? 0) + 1);
      }
      finalPackages = [...byPackage.entries()].map(([label, count]) => ({
        label,
        count,
      }));
    }

    return NextResponse.json({
      totals: {
        totalRevenue,
        totalCosts,
        monthlyRecurringCosts,
        profitMargin,
        totalProfit,
        mrr: finalMrr,
        arr: finalArr,
        activeClients: finalActiveClients,
        newClientsThisPeriod: finalNewClientsThisPeriod,
        avgLtv,
        avgMonthsRetained,
        churnRate: finalChurnRate,
        clientsLost: finalClientsLost,
      },
      months: buckets.map((b) => b.label),
      series: {
        revenue: revenueSeries,
        costs: costsSeries,
        profit: profitSeries,
        mrr: finalMrrSeries,
        arr: finalArrSeries,
        newClients: finalNewClientsSeries,
      },
      topCustomers,
      packagesDistribution: finalPackages,
      windowStart: windowStart.toISOString(),
      windowed,
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
