import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientPayments, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * GET /api/admin/ledger — the partner ledger, computed from collected client
 * payments. Admin-only.
 *
 * Model: net = amount - partnerCut (referral cut leaves before the split);
 * each partner earns net/2 on every payment. The receiver holds the other
 * partner's half until the split is marked settled, so:
 *   net balance = Σ over PENDING payments of (other partner's half),
 * signed by who received the money. Assumes the two-admin partnership the
 * agency actually runs; with 3+ admins the first two by creation are used.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [admins, rows] = await Promise.all([
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
    ]);

    const name = (a: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    }) => a.firstName || a.email.split("@")[0];

    const partners = admins.map((a) => ({ id: a.id, name: name(a) }));
    const [p1, p2] = partners;

    const transactions = rows.map((r) => {
      const net = r.amount - r.partnerCut;
      const half = Math.round(net / 2);
      const receiver = partners.find((p) => p.id === r.receivedBy);
      const other = partners.find((p) => p.id !== r.receivedBy);
      return {
        ...r,
        receivedByName: receiver?.name ?? "—",
        otherPartnerName: other?.name ?? "—",
        otherPartnerCut: half,
      };
    });

    // Earnings: each partner earns half of every net, regardless of receiver.
    const totalNet = rows.reduce((s, r) => s + (r.amount - r.partnerCut), 0);
    const perPartnerEarned = Math.round(totalNet / 2);

    // Net balance from pending splits only.
    let balance = 0; // positive → p1 received extra, owes p2
    for (const r of rows) {
      if (r.splitStatus !== "pending") continue;
      const half = Math.round((r.amount - r.partnerCut) / 2);
      if (r.receivedBy === p1?.id) balance += half;
      else if (r.receivedBy === p2?.id) balance -= half;
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
