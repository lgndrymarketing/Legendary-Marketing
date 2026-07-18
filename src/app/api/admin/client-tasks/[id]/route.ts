import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientTaskStatusEnum,
  clientTasks,
  users,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { stageFromTasks } from "@/lib/crm";
import { publishToChannel } from "@/lib/ably";

/**
 * PATCH /api/admin/client-tasks/[id] — update a checklist task. Changing a
 * task's status re-derives the client's pipeline stage (the first not-yet-
 * completed task's stage), which auto-advances the Kanban board.
 * DELETE removes the task and likewise re-syncs the stage.
 */

const updateSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    status: z.enum(clientTaskStatusEnum.enumValues).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** Recompute and persist the client's stage from its current task list. */
async function resyncStage(clientId: string) {
  const tasks = await db
    .select({
      stage: clientTasks.stage,
      status: clientTasks.status,
      order: clientTasks.order,
    })
    .from(clientTasks)
    .where(eq(clientTasks.clientId, clientId))
    .orderBy(asc(clientTasks.order));
  if (!tasks.length) return;
  const stage = stageFromTasks(tasks);
  await db
    .update(agencyClients)
    .set({ stage, updatedAt: new Date() })
    .where(eq(agencyClients.id, clientId));
}

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
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
    const { assigneeId, dueDate, ...rest } = parsed.data;

    let assigneeName: string | null | undefined;
    if (assigneeId !== undefined) {
      if (assigneeId) {
        const [u] = await db
          .select({ firstName: users.firstName, email: users.email })
          .from(users)
          .where(eq(users.id, assigneeId));
        assigneeName = u?.firstName || u?.email.split("@")[0] || null;
      } else {
        assigneeName = null;
      }
    }

    const [updated] = await db
      .update(clientTasks)
      .set({
        ...rest,
        ...(assigneeId !== undefined && { assigneeId, assigneeName }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(clientTasks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (rest.status !== undefined) await resyncStage(updated.clientId);

    try {
      await publishToChannel("admin:crm", "update", { type: "task_updated" });
    } catch {}
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client task update error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

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
      .delete(clientTasks)
      .where(eq(clientTasks.id, id))
      .returning({ clientId: clientTasks.clientId });
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await resyncStage(deleted.clientId);
    try {
      await publishToChannel("admin:crm", "update", { type: "task_deleted" });
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client task delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
