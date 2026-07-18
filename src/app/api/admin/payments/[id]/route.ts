import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

const updateSchema = z
  .object({
    amount: z.number().int().positive().optional(),
    status: z.enum(["completed", "pending", "failed", "refunded"]).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** PATCH /api/admin/payments/[id] — edit amount/status/notes. Admin-only. */
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

    const [updated] = await db
      .update(payments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
