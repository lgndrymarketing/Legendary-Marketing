import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { canManageProjects } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    await verifyProjectAccess(projectId, user.id, user.role);

    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.order), asc(tasks.createdAt));

    return NextResponse.json(projectTasks);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, title, description, priority, assigneeId, dueDate } = parsed.data;

    await verifyProjectAccess(projectId, user.id, user.role);
    const rateLimit = checkRateLimit(user.id + ":tasks", 60);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        title,
        description,
        priority: priority ?? "medium",
        assigneeId,
        createdBy: user.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      })
      .returning();

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Create task error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
