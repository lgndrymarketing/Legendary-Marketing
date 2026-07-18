import Link from "next/link";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderKanban, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/db";
import { projects, users, projectPhases } from "@/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { getAuthenticatedUser, getAccessibleProjectIds } from "@/lib/auth-utils";
import { serviceLabels } from "@/lib/services";

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  revision: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Same semantics as the old badge variants, rendered as uppercase mono text.
const statusClass: Record<string, string> = {
  onboarding: "text-muted-foreground",
  payment_pending: "text-warning",
  in_progress: "text-orange",
  revision: "text-warning",
  completed: "text-success",
  cancelled: "text-muted-foreground",
};

export default async function AdminProjectsPage() {
  const user = await getAuthenticatedUser();
  const accessible = await getAccessibleProjectIds(user.id, user.role);

  // VAs with no assigned projects get an empty array — nothing to show.
  const hasScope = accessible === "all" || accessible.length > 0;

  const rows = hasScope
    ? await db
        .select({
          id: projects.id,
          name: projects.name,
          serviceType: projects.serviceType,
          status: projects.status,
          clientFirstName: users.firstName,
          clientLastName: users.lastName,
          clientEmail: users.email,
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(
          accessible === "all" ? undefined : inArray(projects.id, accessible)
        )
        .orderBy(desc(projects.createdAt))
    : [];

  // Fetch the in-progress phase for each listed project (one query, then map).
  const phaseMap = new Map<string, string>();
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const activePhases = await db
      .select({
        projectId: projectPhases.projectId,
        name: projectPhases.name,
      })
      .from(projectPhases)
      .where(
        and(
          inArray(projectPhases.projectId, ids),
          eq(projectPhases.status, "in_progress")
        )
      );
    for (const p of activePhases) {
      if (!phaseMap.has(p.projectId)) phaseMap.set(p.projectId, p.name);
    }
  }

  return (
    <div className="space-y-10">
      <PageHero
        title="Campaigns"
        description="Manage all client campaigns and update phases."
      />

      <section>
        <BracketLabel n={rows.length} label="ALL PROJECTS" className="pb-4" />
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No campaigns yet"
            description="Client campaigns will appear here once they're created."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Campaign</th>
                  <th className="micro-label py-3 pr-4">Client</th>
                  <th className="micro-label py-3 pr-4">Service</th>
                  <th className="micro-label py-3 pr-4">Phase</th>
                  <th className="micro-label py-3 pr-4">Status</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((project) => {
                  const clientName =
                    [project.clientFirstName, project.clientLastName]
                      .filter(Boolean)
                      .join(" ") ||
                    project.clientEmail ||
                    "—";
                  return (
                    <tr
                      key={project.id}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 font-medium transition-colors group-hover:text-orange">
                        {project.name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {clientName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {serviceLabels[project.serviceType] || project.serviceType}
                      </td>
                      <td className="py-3 pr-4">
                        {phaseMap.has(project.id) ? (
                          <span className="font-mono text-xs text-foreground">
                            {phaseMap.get(project.id)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "font-mono text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
                            statusClass[project.status] ?? "text-muted-foreground"
                          )}
                        >
                          {statusLabels[project.status] || project.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/campaigns/${project.id}`}
                          aria-label={`Manage ${project.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-orange/40 hover:bg-orange/5 hover:text-orange active:scale-[0.98]"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
