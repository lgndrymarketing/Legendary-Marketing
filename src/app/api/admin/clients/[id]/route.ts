import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientPackageEnum,
  clientStatusEnum,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

const updateSchema = z
  .object({
    contactName: z.string().min(1).max(255).optional(),
    companyName: z.string().min(1).max(255).optional(),
    businessType: z.string().max(100).nullable().optional(),
    package: z.enum(clientPackageEnum.enumValues).optional(),
    packageLabel: z.string().max(100).nullable().optional(),
    setupFee: z.number().int().min(0).optional(),
    monthlyFee: z.number().int().min(0).optional(),
    partnerCut: z.number().int().min(0).optional(),
    startDate: z.string().datetime().optional(),
    nextDueDate: z.string().datetime().nullable().optional(),
    status: z.enum(clientStatusEnum.enumValues).optional(),
    userId: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** DELETE /api/admin/clients/[id] — remove a client (payments cascade). Admin-only. */
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
      .delete(agencyClients)
      .where(eq(agencyClients.id, id))
      .returning({ id: agencyClients.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/clients/[id] — edit a client record. Admin-only. */
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
    const { startDate, nextDueDate, ...rest } = parsed.data;

    const [updated] = await db
      .update(agencyClients)
      .set({
        ...rest,
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(nextDueDate !== undefined && {
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(agencyClients.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client update error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
