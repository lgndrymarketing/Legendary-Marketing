import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientTaskPriorityEnum,
  clientTasks,
  departmentEnum,
  users,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";

/** GET/POST /api/admin/clients/[id]/tasks — the client's onboarding checklist. */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const tasks = await db
      .select()
      .from(clientTasks)
      .where(eq(clientTasks.clientId, id))
      .orderBy(asc(clientTasks.order), asc(clientTasks.createdAt));
    return NextResponse.json({ tasks });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(255),
  department: z.enum(departmentEnum.enumValues).nullable().optional(),
  priority: z.enum(clientTaskPriorityEnum.enumValues).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const [client] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(eq(agencyClients.id, id));
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid task" }, { status: 400 });
    }
    const { title, department, priority, assigneeId, dueDate, notes } =
      parsed.data;

    let assigneeName: string | null = null;
    if (assigneeId) {
      const [u] = await db
        .select({ firstName: users.firstName, email: users.email })
        .from(users)
        .where(eq(users.id, assigneeId));
      assigneeName = u?.firstName || u?.email.split("@")[0] || null;
    }

    // Custom tasks append to the end and carry no pipeline stage.
    const existing = await db
      .select({ order: clientTasks.order })
      .from(clientTasks)
      .where(eq(clientTasks.clientId, id));
    const nextOrder =
      existing.reduce((m, t) => Math.max(m, t.order), -1) + 1;

    const [created] = await db
      .insert(clientTasks)
      .values({
        clientId: id,
        title,
        department: department ?? null,
        priority: priority ?? "medium",
        assigneeId: assigneeId ?? null,
        assigneeName,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
        order: nextOrder,
      })
      .returning();

    try {
      await publishToChannel("admin:crm", "update", { type: "task_created" });
    } catch {}
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client task create error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
