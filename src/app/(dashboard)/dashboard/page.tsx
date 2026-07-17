import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PhaseTrackerHorizontal, type Phase } from "@/components/dashboard/phase-tracker";
import { FolderKanban, MessageSquare, Upload, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { projects, projectPhases, messages, files, users } from "@/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import { serviceLabels } from "@/lib/services";

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  revision: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) return null;

  // Get the DB user
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, user.id));

  if (!dbUser) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome, ${user.firstName || "there"}`}
          description="Your account is being set up. Please refresh in a moment."
        />
      </div>
    );
  }

  // The client portal is a personal surface: only the signed-in user's own
  // projects, regardless of role. Staff manage all client work in /admin
  // (properly scoped there) — this never exposes other clients' projects.
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, dbUser.id));

  const activeProjects = userProjects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled"
  );

  // Fetch phases for active projects
  const projectIds = activeProjects.map((p) => p.id);
  const allPhases =
    projectIds.length > 0
      ? await db
          .select()
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
      : [];

  // Count messages across all user projects
  const allProjectIds = userProjects.map((p) => p.id);
  const messageCount =
    allProjectIds.length > 0
      ? (
          await db
            .select({ value: count() })
            .from(messages)
            .where(inArray(messages.projectId, allProjectIds))
        )[0]?.value ?? 0
      : 0;

  // Count files across all user projects
  const fileCount =
    allProjectIds.length > 0
      ? (
          await db
            .select({ value: count() })
            .from(files)
            .where(inArray(files.projectId, allProjectIds))
        )[0]?.value ?? 0
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.firstName || "there"}`}
        description="Here's an overview of your projects."
        action={
          <Button variant="glow" asChild>
            <Link href="/onboarding">
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Projects" value={activeProjects.length} icon={FolderKanban} />
        <StatCard label="Messages" value={messageCount} icon={MessageSquare} />
        <StatCard label="Files Uploaded" value={fileCount} icon={Upload} />
      </div>

      {/* Active Projects */}
      {activeProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No active projects yet"
            description="Start a new project and we'll track your progress right here."
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
        activeProjects.map((project) => {
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
            <Card key={project.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {serviceLabels[project.serviceType] || project.serviceType}
                  </p>
                </div>
                <Badge variant="orange">
                  {statusLabels[project.status] || project.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {phases.length > 0 && (
                  <PhaseTrackerHorizontal phases={phases} />
                )}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/messages">
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Messages
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}`}>
                      <Upload className="mr-1 h-4 w-4" />
                      Upload Files
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
