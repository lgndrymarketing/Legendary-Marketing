import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { PhaseTrackerHorizontal, type Phase } from "@/components/dashboard/phase-tracker";
import { Plus, ArrowRight, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { projects, projectPhases, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
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

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId));

  if (!dbUser) {
    return (
      <div className="space-y-8">
        <PageHero
          title="Campaigns"
          description="Your account is being set up. Please refresh in a moment."
        />
      </div>
    );
  }

  // Personal client surface — only the user's own projects (see dashboard).
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, dbUser.id));

  const projectIds = userProjects.map((p) => p.id);
  const allPhases =
    projectIds.length > 0
      ? await db
          .select()
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
      : [];

  return (
    <div className="space-y-10">
      <PageHero
        title="Campaigns"
        description="Manage and track all your campaigns."
        action={
          <Button variant="glow" asChild>
            <Link href="/onboarding">
              <Plus className="mr-1 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        }
      />

      {userProjects.length === 0 ? (
        <div className="animate-fade-up rounded-xl border border-border">
          <EmptyState
            icon={FolderKanban}
            title="No campaigns yet"
            description="Start your first campaign and we'll build something great together."
            action={
              <Button variant="glow" asChild>
                <Link href="/onboarding">
                  <Plus className="mr-1 h-4 w-4" />
                  New Campaign
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="animate-fade-up divide-y divide-border border-b border-border">
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

            const completedPhases = phases.filter(
              (p) => p.status === "completed"
            ).length;

            return (
              <section key={project.id} className="py-8 first:pt-0">
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

                <div className="mt-6 flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/campaigns/${project.id}`} className="group">
                      View Campaign
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
