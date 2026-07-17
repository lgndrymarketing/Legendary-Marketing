import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PhaseTrackerHorizontal, type Phase } from "@/components/dashboard/phase-tracker";
import { Plus, ArrowRight, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { projects, projectPhases, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { isStaff } from "@/lib/permissions";
import { serviceLabels } from "@/lib/services";

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  revision: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusVariants: Record<string, "orange" | "success" | "secondary"> = {
  in_progress: "orange",
  completed: "success",
};

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId));

  if (!dbUser) return null;

  const userProjects =
    isStaff(dbUser.role)
      ? await db.select().from(projects)
      : await db.select().from(projects).where(eq(projects.userId, dbUser.id));

  const projectIds = userProjects.map((p) => p.id);
  const allPhases =
    projectIds.length > 0
      ? await db
          .select()
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
      : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Manage and track all your projects."
        action={
          <Button variant="glow" asChild>
            <Link href="/onboarding">
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Link>
          </Button>
        }
      />

      {userProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Start your first project and we'll build something great together."
            action={
              <Button variant="glow" asChild>
                <Link href="/onboarding">
                  <Plus className="mr-1 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {userProjects.map((project) => {
            const phases = allPhases
              .filter((p) => p.projectId === project.id)
              .sort((a, b) => a.order - b.order)
              .map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                order: p.order,
              })) satisfies Phase[];

            return (
              <Card key={project.id} className="transition-all hover:shadow-md hover:border-orange/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {serviceLabels[project.serviceType] || project.serviceType}
                    </p>
                  </div>
                  <Badge variant={statusVariants[project.status] || "orange"}>
                    {statusLabels[project.status] || project.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phases.length > 0 && (
                    <PhaseTrackerHorizontal phases={phases} />
                  )}
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>
                        View Project
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
