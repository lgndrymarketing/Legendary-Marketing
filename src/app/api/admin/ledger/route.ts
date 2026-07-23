import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientPayments, expenses, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { pickPartners } from "@/lib/partners";

/**
 * GET /api/admin/ledger — the partner ledger, computed from collected client
 * payments MINUS business expenses, so partners split profit, not revenue.
 * Admin-only.
 *
 * Model: per payment, net = amount - partnerCut (referral cut leaves before
 * anything). Expenses (one-time, plus monthly recurring expanded per elapsed
 * month — same math as the Financials page) are deducted from the pool:
 *   profit = Σ net - totalExpenses
 * Each partner earns profit/2. Outstanding splits scale with profit: every
 * PENDING payment's owed half is net/2 × (profit / Σ net), clamped to [0,1],
 * so expenses are automatically deducted from what changes hands. Settled
 * rows keep their nominal half — they were paid out under the numbers of
 * their day. Partner selection (Uri & Duke by first name, dev/other admins
 * excluded) lives in src/lib/partners.ts, shared with the receiver lists.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [admins, rows, expenseRows] = await Promise.all([
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.role, "admin"))
        .orderBy(users.createdAt),
      db
        .select({
          id: clientPayments.id,
          clientId: clientPayments.clientId,
          companyName: agencyClients.companyName,
          paymentType: clientPayments.paymentType,
          method: clientPayments.method,
          amount: clientPayments.amount,
          partnerCut: clientPayments.partnerCut,
          receivedBy: clientPayments.receivedBy,
          splitStatus: clientPayments.splitStatus,
          paidAt: clientPayments.paidAt,
          notes: clientPayments.notes,
        })
        .from(clientPayments)
        .leftJoin(agencyClients, eq(clientPayments.clientId, agencyClients.id))
        .orderBy(desc(clientPayments.paidAt))
        .limit(500),
      db
        .select({
          amount: expenses.amount,
          cadence: expenses.cadence,
          incurredAt: expenses.incurredAt,
        })
        .from(expenses),
    ]);

    const name = (a: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    }) => a.firstName || a.email.split("@")[0];

    const partners = pickPartners(admins).map((a) => ({
      id: a.id,
      name: name(a),
    }));
    const [p1, p2] = partners;

    // Total costs — one-time expenses in full; monthly expenses recur every
    // month from incurredAt through now (inclusive). Mirrors /admin/metrics.
    const now = new Date();
    let totalExpenses = 0;
    for (const e of expenseRows) {
      if (e.cadence === "monthly") {
        const incurred = new Date(e.incurredAt);
        const elapsed =
          (now.getUTCFullYear() - incurred.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - incurred.getUTCMonth()) +
          1;
        totalExpenses += e.amount * Math.max(elapsed, 1);
      } else {
        totalExpenses += e.amount;
      }
    }

    const totalNet = rows.reduce((s, r) => s + (r.amount - r.partnerCut), 0);
    const profit = totalNet - totalExpenses;
    // Share of each collected dollar that is actually profit to split.
    const profitRatio =
      totalNet > 0 ? Math.min(Math.max(profit / totalNet, 0), 1) : 0;

    const transactions = rows.map((r) => {
      const net = r.amount - r.partnerCut;
      const nominalHalf = Math.round(net / 2);
      // Pending splits pay out on profit; settled ones already changed hands.
      const half =
        r.splitStatus === "pending"
          ? Math.round((net / 2) * profitRatio)
          : nominalHalf;
      const receiver = partners.find((p) => p.id === r.receivedBy);
      const other = partners.find((p) => p.id !== r.receivedBy);
      return {
        ...r,
        receivedByName: receiver?.name ?? "—",
        otherPartnerName: other?.name ?? "—",
        otherPartnerCut: half,
      };
    });

    // Earnings: each partner's share of PROFIT (can go negative when
    // expenses outrun collections — shown truthfully, never floored).
    const perPartnerEarned = Math.round(profit / 2);

    // Net balance from pending splits only, at profit-adjusted halves.
    let balance = 0; // positive → p1 received extra, owes p2
    for (const t of transactions) {
      if (t.splitStatus !== "pending") continue;
      if (t.receivedBy === p1?.id) balance += t.otherPartnerCut;
      else if (t.receivedBy === p2?.id) balance -= t.otherPartnerCut;
    }
    const netBalance =
      !p1 || !p2 || balance === 0
        ? null
        : balance > 0
        ? { from: p1.name, to: p2.name, amount: balance }
        : { from: p2.name, to: p1.name, amount: -balance };

    return NextResponse.json({
      partners: partners.map((p) => ({ ...p, earned: perPartnerEarned })),
      netBalance,
      transactions,
      summary: {
        totalNet,
        totalExpenses,
        profit,
        profitRatio,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Ledger fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger" },
      { status: 500 }
    );
  }
}
