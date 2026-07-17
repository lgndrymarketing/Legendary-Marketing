import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, projects, users } from "@/db/schema";
import { desc, eq, sum } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * GET /api/admin/payments — billing history for the agency. Admin-only.
 * Returns payments joined to their project + client, newest first (limit 200),
 * plus revenue summary totals in cents.
 *
 * Summary totals are computed with dedicated aggregate SUMs over ALL payments
 * (not just the returned page), so `paid` always equals the Overview's revenue
 * figure — both derive from SUM(amount) WHERE status = 'completed'.
 */
export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        source: payments.source,
        createdAt: payments.createdAt,
        projectId: payments.projectId,
        projectName: projects.name,
        clientFirstName: users.firstName,
        clientLastName: users.lastName,
        clientEmail: users.email,
      })
      .from(payments)
      .leftJoin(projects, eq(payments.projectId, projects.id))
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(200);

    const [[paidRow], [pendingRow], [totalRow]] = await Promise.all([
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, "completed")),
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, "pending")),
      db.select({ value: sum(payments.amount) }).from(payments),
    ]);

    return NextResponse.json({
      payments: rows,
      summary: {
        // sum() returns a numeric string or null — coerce to cents integers.
        total: Number(totalRow?.value ?? 0),
        paid: Number(paidRow?.value ?? 0),
        pending: Number(pendingRow?.value ?? 0),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
