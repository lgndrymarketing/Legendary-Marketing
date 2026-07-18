import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  partnerLedgerEntries,
  ledgerEntryTypeEnum,
  users,
  payments,
} from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Partner ledger — profit splits between the agency's admins. Admin-only.
 * GET  /api/admin/ledger — entries (newest first), per-partner balances, and
 *                          the list of partners (admin users) for the form.
 * POST /api/admin/ledger — record a credit (profit share allocated) or a
 *                          payout (money actually sent). Amount in cents.
 */

const entrySchema = z.object({
  partnerId: z.string().uuid(),
  entryType: z.enum(ledgerEntryTypeEnum.enumValues),
  amount: z.number().int().positive(),
  description: z.string().max(2000).optional(),
  paymentId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const [entries, partners] = await Promise.all([
      db
        .select({
          id: partnerLedgerEntries.id,
          partnerId: partnerLedgerEntries.partnerId,
          entryType: partnerLedgerEntries.entryType,
          amount: partnerLedgerEntries.amount,
          description: partnerLedgerEntries.description,
          paymentId: partnerLedgerEntries.paymentId,
          createdAt: partnerLedgerEntries.createdAt,
          partnerFirstName: users.firstName,
          partnerLastName: users.lastName,
          partnerEmail: users.email,
        })
        .from(partnerLedgerEntries)
        .leftJoin(users, eq(partnerLedgerEntries.partnerId, users.id))
        .orderBy(desc(partnerLedgerEntries.createdAt))
        .limit(500),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.role, ["admin", "project_manager"])),
    ]);

    // Per-partner balances from the full entry set.
    const balances = new Map<
      string,
      { credited: number; paidOut: number }
    >();
    for (const e of entries) {
      const b = balances.get(e.partnerId) ?? { credited: 0, paidOut: 0 };
      if (e.entryType === "credit") b.credited += e.amount;
      else b.paidOut += e.amount;
      balances.set(e.partnerId, b);
    }

    const partnerName = (p: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    }) => [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email;

    return NextResponse.json({
      entries,
      partners: partners.map((p) => ({
        id: p.id,
        name: partnerName(p),
        email: p.email,
        credited: balances.get(p.id)?.credited ?? 0,
        paidOut: balances.get(p.id)?.paidOut ?? 0,
        balance:
          (balances.get(p.id)?.credited ?? 0) -
          (balances.get(p.id)?.paidOut ?? 0),
      })),
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

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = entrySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid entry", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { partnerId, paymentId } = parsed.data;

    // The partner must be a staff partner (admin or PM), not a client.
    const [partner] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, partnerId));
    if (!partner || !["admin", "project_manager"].includes(partner.role)) {
      return NextResponse.json(
        { error: "Partner must be an admin or project manager" },
        { status: 400 }
      );
    }

    if (paymentId) {
      const [payment] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.id, paymentId));
      if (!payment) {
        return NextResponse.json(
          { error: "Linked payment not found" },
          { status: 400 }
        );
      }
    }

    const [created] = await db
      .insert(partnerLedgerEntries)
      .values({ ...parsed.data, createdBy: admin.id })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Ledger create error:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
