import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectPhases, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { canManageProjects } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    await verifyProjectAccess(id, user.id, user.role);

    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, id));

    return NextResponse.json(phases);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Phases error:", error);
    return NextResponse.json(
      { error: "Failed to fetch phases" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  phaseId: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "completed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();

    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { phaseId, status } = parsed.data;

    const [updated] = await db
      .update(projectPhases)
      .set({
        status,
        ...(status === "in_progress" ? { startedAt: new Date() } : {}),
        ...(status === "completed" ? { completedAt: new Date() } : {}),
      })
      .where(
        and(
          eq(projectPhases.id, phaseId),
          eq(projectPhases.projectId, id)
        )
      )
      .returning();

    // Notify the project's client (owner) that a phase moved (best-effort,
    // never fails the update). Only fires when a phase actually matched.
    if (updated) {
      const [project] = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, id));
      if (project) {
        await createNotification({
          userId: project.userId,
          projectId: id,
          type: "phase_update",
          title: "Project phase updated",
          body: `"${updated.name}" is now ${updated.status.replace("_", " ")}.`,
          actionUrl: `/campaigns/${id}`,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Phase update error:", error);
    return NextResponse.json(
      { error: "Failed to update phase" },
      { status: 500 }
    );
  }
}
