import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, projects, users } from "@/db/schema";
import { desc, eq, sum } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

const PAYMENT_STATUSES = ["completed", "pending", "failed", "refunded"] as const;

const createPaymentSchema = z.object({
  projectId: z.string().uuid(),
  // Cents, positive.
  amount: z.number().int().positive(),
  status: z.enum(PAYMENT_STATUSES).default("completed"),
  notes: z.string().max(2000).optional(),
});

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
        notes: payments.notes,
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

    const [[paidRow], [pendingRow]] = await Promise.all([
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, "completed")),
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, "pending")),
    ]);

    // sum() returns a numeric string or null — coerce to cents integers.
    // Total = paid + pending only; cancelled/failed/refunded rows are excluded
    // so the headline never exceeds real money in play.
    const paid = Number(paidRow?.value ?? 0);
    const pending = Number(pendingRow?.value ?? 0);

    return NextResponse.json({
      payments: rows,
      summary: {
        total: paid + pending,
        paid,
        pending,
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

/**
 * POST /api/admin/payments — record a payment manually (admin-only).
 * The client is derived from the chosen project's owner; source = "portal".
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const parsed = createPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { projectId, amount, status, notes } = parsed.data;

    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const [created] = await db
      .insert(payments)
      .values({
        projectId,
        userId: project.userId,
        amount,
        status,
        notes,
        source: "portal",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Payment create error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
