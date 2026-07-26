import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  clientPayments,
  clientPaymentTypeEnum,
  splitStatusEnum,
  users,
  expenses,
} from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

const updateSchema = z
  .object({
    paymentType: z.enum(clientPaymentTypeEnum.enumValues).optional(),
    method: z.string().min(1).max(50).optional(),
    amount: z.number().int().positive().optional(),
    receivedBy: z.string().uuid().optional(),
    splitStatus: z.enum(splitStatusEnum.enumValues).optional(),
    paidAt: z.string().datetime().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** PATCH — edit a payment record (method, receiver, amount, settle). Admin-only. */
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

    if (parsed.data.receivedBy) {
      const [receiver] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, parsed.data.receivedBy));
      if (!receiver || receiver.role !== "admin") {
        return NextResponse.json(
          { error: "Receiver must be an admin" },
          { status: 400 }
        );
      }
    }

    const { paidAt, ...rest } = parsed.data;

    // Lowering the amount must re-clamp the snapshotted referral cut, or the
    // net (and every split derived from it) goes negative.
    let partnerCutFix: number | undefined;
    if (rest.amount !== undefined) {
      const [current] = await db
        .select({ partnerCut: clientPayments.partnerCut })
        .from(clientPayments)
        .where(eq(clientPayments.id, id));
      if (current && current.partnerCut > rest.amount) {
        partnerCutFix = rest.amount;
      }
    }

    const [updated] = await db
      .update(clientPayments)
      .set({
        ...rest,
        // paidAt arrives as an ISO string; the column is a timestamp.
        ...(paidAt && { paidAt: new Date(paidAt) }),
        ...(partnerCutFix !== undefined && { partnerCut: partnerCutFix }),
        ...(rest.splitStatus === "settled" && { settledAt: new Date() }),
        ...(rest.splitStatus === "pending" && { settledAt: null }),
      })
      .where(eq(clientPayments.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client payment update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

/** DELETE — remove a mis-recorded payment. Admin-only. */
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

    // Remove the auto-booked processor-fee expense alongside the payment,
    // otherwise the fee lingers on the P&L for money that was never taken.
    await db
      .delete(expenses)
      .where(
        and(
          eq(expenses.category, "fees"),
          ilike(expenses.notes, `Auto-recorded from % payment ${id}`)
        )
      );

    const [deleted] = await db
      .delete(clientPayments)
      .where(eq(clientPayments.id, id))
      .returning({ id: clientPayments.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client payment delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
