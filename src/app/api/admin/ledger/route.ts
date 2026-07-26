import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientPayments, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { pickPartners } from "@/lib/partners";

/**
 * GET /api/admin/ledger — the partner ledger, computed from collected client
 * payments. Admin-only.
 *
 * Model: per payment, net = amount - partnerCut (referral cut leaves before
 * the split); each partner earns net/2 on every payment — the FULL collected
 * amount, before expenses (expenses live on the P&L only, by request). The
 * receiver holds the other partner's half until the split is marked settled:
 *   net balance = Σ over PENDING payments of (other partner's half),
 * signed by who received the money. Partner selection (Uri & Duke by first
 * name, dev/other admins excluded) lives in src/lib/partners.ts, shared
 * with the receiver lists.
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

    const partners = pickPartners(admins).map((a) => ({
      id: a.id,
      name: name(a),
    }));
    const [p1, p2] = partners;

    const transactions = rows.map((r) => {
      // Guard against a negative net if partnerCut was left above a lowered
      // amount on an older row.
      const net = Math.max(0, r.amount - r.partnerCut);
      const receiver = partners.find((p) => p.id === r.receivedBy);
      // Only attribute the other half when the receiver IS a partner —
      // otherwise `find(p => p.id !== receivedBy)` would name p1 for a
      // payment they never received.
      const other = receiver
        ? partners.find((p) => p.id !== r.receivedBy)
        : undefined;
      // Floor the transfer so the receiver keeps the odd cent; the two
      // halves then sum back to net exactly.
      const half = other ? Math.floor(net / 2) : 0;
      return {
        ...r,
        receivedByName: receiver?.name ?? "—",
        otherPartnerName: other?.name ?? "—",
        otherPartnerCut: half,
        /** False when the receiver isn't a ledger partner — excluded from the split. */
        inSplit: !!other,
      };
    });

    // Earnings: each partner earns half of every net collection — the full
    // pre-expense amount.
    // Earnings only count payments that actually belong to the partnership.
    const totalNet = transactions
      .filter((t) => t.inSplit)
      .reduce((s, r) => s + Math.max(0, r.amount - r.partnerCut), 0);
    const perPartnerEarned = Math.floor(totalNet / 2);

    // Net balance from pending splits only.
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
