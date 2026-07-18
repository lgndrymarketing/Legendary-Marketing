import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseCategoryEnum, expenseCadenceEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

const updateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    category: z.enum(expenseCategoryEnum.enumValues).optional(),
    categoryLabel: z.string().max(100).nullable().optional(),
    amount: z.number().int().positive().optional(),
    cadence: z.enum(expenseCadenceEnum.enumValues).optional(),
    incurredAt: z.string().datetime().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** PATCH /api/admin/expenses/[id] — edit an expense record. Admin-only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { incurredAt, ...rest } = parsed.data;

    const [updated] = await db
      .update(expenses)
      .set({
        ...rest,
        ...(incurredAt && { incurredAt: new Date(incurredAt) }),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Expense update error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/expenses/[id] — remove an expense record. Admin-only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Expense delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
