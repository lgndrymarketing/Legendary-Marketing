import type { UserRole } from "@/db/schema";

/**
 * Tiered access control for the agency's internal team.
 *
 * admin           — full control: billing, integrations, team roles, everything.
 * project_manager — runs client projects day-to-day: tasks, phases, messaging, files.
 * va              — execution-level access: update tasks assigned to them, message clients.
 * client          — their own projects only (enforced separately via verifyProjectAccess).
 */

const STAFF_ROLES: UserRole[] = ["admin", "project_manager", "va"];

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

export function isAdmin(role: string): boolean {
  return role === "admin";
}

/** Billing, GHL integration settings, team roles. */
export function canManageAgency(role: string): boolean {
  return role === "admin";
}

/** Create/reassign tasks, advance phases, manage client-facing project data. */
export function canManageProjects(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

/**
 * See every project/client/lead in the agency. Admins and project managers do;
 * VAs are scoped to only the projects they're assigned work on (enforced in
 * verifyProjectAccess), and clients see only their own.
 */
export function canViewAllProjects(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

/** Read lead PII (name/email/phone/budget) and triage the pipeline. */
export function canManageLeads(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

/** Update the status/notes of tasks — any staff member, scoped to their own assignments for VAs. */
export function canUpdateTask(
  role: string,
  userId: string,
  task: { assigneeId: string | null }
): boolean {
  if (role === "admin" || role === "project_manager") return true;
  if (role === "va") return task.assigneeId === userId;
  return false;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  admin: "Admin",
  project_manager: "Project Manager",
  va: "VA",
};
