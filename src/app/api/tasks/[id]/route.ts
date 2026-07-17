import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { canUpdateTask, canManageProjects } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  order: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canUpdateTask(user.role, user.id, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await verifyProjectAccess(task.projectId, user.id, user.role);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { dueDate, ...rest } = parsed.data;

    // VAs may only move their assigned task's status/notes — not retitle,
    // reprioritize, reassign, or reschedule it. Managers may edit everything.
    const changes = canManageProjects(user.role)
      ? {
          ...rest,
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        }
      : {
          ...(rest.status !== undefined ? { status: rest.status } : {}),
          ...(rest.description !== undefined ? { description: rest.description } : {}),
        };

    const [updated] = await db
      .update(tasks)
      .set({
        ...changes,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Update task error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await verifyProjectAccess(task.projectId, user.id, user.role);
    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
