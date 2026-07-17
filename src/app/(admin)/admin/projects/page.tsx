import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderKanban, ArrowRight } from "lucide-react";
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

const statusVariant: Record<string, "success" | "warning" | "orange" | "secondary"> = {
  onboarding: "secondary",
  payment_pending: "warning",
  in_progress: "orange",
  revision: "warning",
  completed: "success",
  cancelled: "secondary",
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Manage all client projects and update phases.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-orange" />
            All Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Client projects will appear here once they're created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Phase</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium"></th>
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
                      <tr key={project.id} className="hover:bg-muted/50">
                        <td className="py-3 font-medium">{project.name}</td>
                        <td className="py-3 text-muted-foreground">{clientName}</td>
                        <td className="py-3 text-muted-foreground">
                          {serviceLabels[project.serviceType] || project.serviceType}
                        </td>
                        <td className="py-3">
                          {phaseMap.has(project.id) ? (
                            <Badge variant="secondary">{phaseMap.get(project.id)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusVariant[project.status] ?? "secondary"}>
                            {statusLabels[project.status] || project.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/projects/${project.id}`}>
                              Manage <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
