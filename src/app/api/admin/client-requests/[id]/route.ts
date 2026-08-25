import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientRequestStatusEnum, clientRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";
import { createNotification } from "@/lib/notifications";
import { publishToChannel } from "@/lib/ably";
import { z } from "zod";

const updateSchema = z
  .object({
    status: z.enum(clientRequestStatusEnum.enumValues).optional(),
    adminNotes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/**
 * PATCH /api/admin/client-requests/[id] — triage a portal request: move its
 * status and reply to the client. Staff-accessible, matching who handles
 * client work day to day. The client is notified so a reply never sits
 * unseen in a table they have no reason to revisit.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();

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

    const [existing] = await db
      .select({
        userId: clientRequests.userId,
        status: clientRequests.status,
        adminNotes: clientRequests.adminNotes,
        subject: clientRequests.subject,
      })
      .from(clientRequests)
      .where(eq(clientRequests.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(clientRequests)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(clientRequests.id, id))
      .returning();

    // Only ping them when something actually changed for them — a reply, or
    // a new status. Best-effort: never fail the save on a notification.
    const statusChanged =
      parsed.data.status !== undefined && parsed.data.status !== existing.status;
    const replied =
      parsed.data.adminNotes !== undefined &&
      parsed.data.adminNotes !== existing.adminNotes &&
      !!parsed.data.adminNotes;
    if (statusChanged || replied) {
      try {
        await createNotification({
          userId: existing.userId,
          type: "revision_response",
          title: replied ? "The team replied to your request" : "Request update",
          body: `${existing.subject} — ${(updated.status as string).replace("_", " ")}`,
          actionUrl: "/requests",
        });
      } catch (err) {
        console.error("Request notify failed:", err);
      }
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "request_updated" });
    } catch {}

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client request update error:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}
