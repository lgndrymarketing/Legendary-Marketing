import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
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

/** Status → uppercase-mono text color (design.md §2.1 semantics). */
const statusTone: Record<string, string> = {
  onboarding: "text-muted-foreground",
  payment_pending: "text-warning",
  in_progress: "text-orange",
  revision: "text-warning",
  completed: "text-success",
  cancelled: "text-destructive",
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
        <PageHero
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

  const stats = [
    { label: "Active Projects", value: activeProjects.length },
    { label: "Messages", value: messageCount },
    { label: "Files Uploaded", value: fileCount },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <PageHero
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

      {/* Stats — hairline-divided 3-up, big numerals */}
      <div className="animate-fade-up grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.label} className="py-6 sm:px-8 sm:first:pl-0">
            <p className="text-4xl font-bold tracking-tight">
              {stat.value.toLocaleString("en-US")}
            </p>
            <p className="micro-label mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      {activeProjects.length === 0 ? (
        <div className="animate-fade-up rounded-xl border border-border">
          <EmptyState
            icon={FolderKanban}
            title="No active campaigns yet"
            description="Start a new campaign and we'll track your progress right here."
            action={
              <Button variant="glow" asChild>
                <Link href="/onboarding">
                  <Plus className="mr-1 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            }
          />
        </div>
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

          const completedPhases = phases.filter(
            (p) => p.status === "completed"
          ).length;

          return (
            <section
              key={project.id}
              className="animate-fade-up border-b border-border pb-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {serviceLabels[project.serviceType] || project.serviceType}
                  </p>
                </div>
                <span
                  className={`font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    statusTone[project.status] || "text-orange"
                  }`}
                >
                  {statusLabels[project.status] || project.status}
                </span>
              </div>

              {phases.length > 0 && (
                <div className="mt-6 space-y-4">
                  <BracketLabel
                    n={completedPhases}
                    m={phases.length}
                    label="Phases"
                  />
                  <PhaseTrackerHorizontal phases={phases} />
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/campaigns/${project.id}`}>View Details</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/messages">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Messages
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/campaigns/${project.id}`}>
                    <Upload className="mr-1 h-4 w-4" />
                    Upload Files
                  </Link>
                </Button>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
