import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseCategoryEnum, expenseCadenceEnum } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Agency expenses — admin-only (this is the cost side of the P&L).
 * GET  /api/admin/expenses — all expenses, newest first, plus summary totals.
 * POST /api/admin/expenses — record an expense. Amount arrives in cents.
 */

const expenseSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(expenseCategoryEnum.enumValues),
  amount: z.number().int().positive(),
  cadence: z.enum(expenseCadenceEnum.enumValues),
  incurredAt: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.incurredAt))
      .limit(500);

    const monthlyRecurring = rows
      .filter((e) => e.cadence === "monthly")
      .reduce((s, e) => s + e.amount, 0);
    const oneTimeTotal = rows
      .filter((e) => e.cadence === "one_time")
      .reduce((s, e) => s + e.amount, 0);

    const now = new Date();
    const thisMonth = rows
      .filter((e) => {
        const d = new Date(e.incurredAt);
        return (
          e.cadence === "monthly" ||
          (d.getUTCFullYear() === now.getUTCFullYear() &&
            d.getUTCMonth() === now.getUTCMonth())
        );
      })
      .reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      expenses: rows,
      summary: { monthlyRecurring, oneTimeTotal, thisMonth },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Expenses fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid expense", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { incurredAt, ...rest } = parsed.data;
    const [created] = await db
      .insert(expenses)
      .values({
        ...rest,
        incurredAt: incurredAt ? new Date(incurredAt) : new Date(),
        createdBy: admin.id,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Expense create error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
