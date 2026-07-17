import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, projects, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isStaff, canViewAllProjects } from "@/lib/permissions";

export type DbUser = typeof users.$inferSelect;

/**
 * True if a VA is assigned at least one task on the project — the basis for
 * scoping VA access to only the projects they actually work on.
 */
export async function vaHasProjectAssignment(
  projectId: string,
  userId: string
): Promise<boolean> {
  const [assignment] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.assigneeId, userId)))
    .limit(1);
  return Boolean(assignment);
}

/**
 * Get the authenticated DB user, or throw a NextResponse error.
 * Callers should catch `NextResponse` instances in their error handler.
 */
export async function getAuthenticatedUser(): Promise<DbUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (!dbUser) {
    throw NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return dbUser;
}

/**
 * Verify the authenticated user may access a project, by role:
 *   - admin / project_manager  → any project
 *   - va                       → only projects they're assigned a task on
 *   - client                   → only projects they own
 * Throws NextResponse on failure.
 */
export async function verifyProjectAccess(projectId: string, userId: string, role: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Admins and project managers see everything.
  if (canViewAllProjects(role)) {
    return project;
  }

  // VAs are scoped to projects they have an assigned task on.
  if (role === "va") {
    if (await vaHasProjectAssignment(projectId, userId)) {
      return project;
    }
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Clients (and anyone else) may only touch projects they own.
  if (project.userId !== userId) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return project;
}

/**
 * The set of projects a user may list/search.
 * Returns "all" for admins and project managers; otherwise an explicit array
 * of project ids: for VAs, the projects they're assigned a task on; for
 * clients, the projects they own.
 */
export async function getAccessibleProjectIds(
  userId: string,
  role: string
): Promise<"all" | string[]> {
  if (canViewAllProjects(role)) return "all";

  if (role === "va") {
    const rows = await db
      .selectDistinct({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));
    return rows.map((r) => r.projectId);
  }

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));
  return rows.map((r) => r.id);
}

/**
 * Require the authenticated user to be staff (admin/project_manager/va).
 * Throws NextResponse on failure.
 */
export async function requireStaff(): Promise<DbUser> {
  const user = await getAuthenticatedUser();
  if (!isStaff(user.role)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

/**
 * Require the authenticated user to be an admin. Throws NextResponse on failure.
 */
export async function requireAdmin(): Promise<DbUser> {
  const user = await getAuthenticatedUser();
  if (user.role !== "admin") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}
