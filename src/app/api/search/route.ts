import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  messages,
  files,
  agencyClients,
  clientTasks,
  leads,
} from "@/db/schema";
import { ilike, and, or, inArray } from "drizzle-orm";
import { getAuthenticatedUser, getAccessibleProjectIds } from "@/lib/auth-utils";
import { isStaff, canManageLeads } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/search — global search, scoped by role.
 *
 * Clients search their own projects/messages/files and get client-portal
 * links. Staff additionally search the CRM they actually work in — agency
 * clients, checklist tasks, and (PM+) leads — and get admin links, so a
 * result opens inside the admin shell instead of bouncing them out to the
 * client portal.
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const rateLimit = checkRateLimit(user.id + ":search", 30);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.trim().length < 2 || q.length > 100) {
      return NextResponse.json([]);
    }

    const pattern = `%${q}%`;
    const staff = isStaff(user.role);

    // Resolve the projects this user may search within, by role.
    const accessible = await getAccessibleProjectIds(user.id, user.role);
    const seesAll = accessible === "all";
    const accessibleProjectIds = seesAll ? [] : accessible;
    const hasProjects = seesAll || accessibleProjectIds.length > 0;

    const [projectResults, messageResults, fileResults] = hasProjects
      ? await Promise.all([
          db
            .select()
            .from(projects)
            .where(
              seesAll
                ? ilike(projects.name, pattern)
                : and(
                    inArray(projects.id, accessibleProjectIds),
                    ilike(projects.name, pattern)
                  )
            )
            .limit(5),
          db
            .select()
            .from(messages)
            .where(
              seesAll
                ? ilike(messages.content, pattern)
                : and(
                    ilike(messages.content, pattern),
                    inArray(messages.projectId, accessibleProjectIds)
                  )
            )
            .limit(5),
          db
            .select()
            .from(files)
            .where(
              seesAll
                ? ilike(files.name, pattern)
                : and(
                    ilike(files.name, pattern),
                    inArray(files.projectId, accessibleProjectIds)
                  )
            )
            .limit(5),
        ])
      : [[], [], []];

    // CRM surfaces — staff only.
    const [clientResults, taskResults, leadResults] = staff
      ? await Promise.all([
          db
            .select({
              id: agencyClients.id,
              companyName: agencyClients.companyName,
              contactName: agencyClients.contactName,
              status: agencyClients.status,
            })
            .from(agencyClients)
            .where(
              or(
                ilike(agencyClients.companyName, pattern),
                ilike(agencyClients.contactName, pattern)
              )
            )
            .limit(5),
          db
            .select({
              id: clientTasks.id,
              title: clientTasks.title,
              status: clientTasks.status,
              assigneeName: clientTasks.assigneeName,
            })
            .from(clientTasks)
            .where(ilike(clientTasks.title, pattern))
            .limit(5),
          canManageLeads(user.role)
            ? db
                .select({
                  id: leads.id,
                  name: leads.name,
                  email: leads.email,
                  status: leads.status,
                })
                .from(leads)
                .where(
                  or(ilike(leads.name, pattern), ilike(leads.email, pattern))
                )
                .limit(5)
            : Promise.resolve([] as { id: string; name: string; email: string; status: string }[]),
        ])
      : [[], [], []];

    // Staff links stay inside the admin shell; clients get portal links.
    const projectHref = (id: string) =>
      staff ? `/admin/campaigns/${id}` : `/campaigns/${id}`;
    const messagesHref = staff ? "/admin/messages" : "/messages";

    const results = [
      ...clientResults.map((c) => ({
        id: c.id,
        type: "client" as const,
        title: c.companyName,
        subtitle: `Client · ${c.contactName} · ${c.status}`,
        href: "/admin/clients",
      })),
      ...projectResults.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.name,
        subtitle: `${p.serviceType} · ${p.status}`,
        href: projectHref(p.id),
      })),
      ...taskResults.map((t) => ({
        id: t.id,
        type: "task" as const,
        title: t.title,
        subtitle: `Task · ${t.assigneeName ?? "Unassigned"} · ${t.status.replace(
          "_",
          " "
        )}`,
        href: "/admin/tasks",
      })),
      ...leadResults.map((l) => ({
        id: l.id,
        type: "lead" as const,
        title: l.name,
        subtitle: `Lead · ${l.email} · ${l.status}`,
        href: "/admin/leads",
      })),
      ...messageResults.map((m) => ({
        id: m.id,
        type: "message" as const,
        title: m.content.substring(0, 80),
        subtitle: `Message · ${m.role}`,
        href: messagesHref,
      })),
      ...fileResults.map((f) => ({
        id: f.id,
        type: "file" as const,
        title: f.name,
        subtitle: `File · ${f.type || "unknown"}`,
        href: projectHref(f.projectId),
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
