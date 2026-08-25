import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/firecrawl";
import { OnboardingTimeline } from "@/components/dashboard/onboarding-timeline";
import { ArrowRight, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { agencyClients, projects, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
          title="Project"
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

  // Whether the team has a roster record for them — if so the Onboarding
  // Timeline carries this page and the "no campaigns" prompt is just noise.
  const [rosterRecord] = await db
    .select({ id: agencyClients.id })
    .from(agencyClients)
    .where(eq(agencyClients.userId, dbUser.id));

  return (
    <div className="space-y-10">
      <PageHero
        title="Project"
        description="Your build, step by step — and the assets that come with it."
      />

      {/* The build the team is running for this client. Renders nothing
          until they have a roster record. */}
      <OnboardingTimeline />

      {/* Campaign workspaces, when they exist. Deliberately no phase
          tracker: the generic Discovery → Scale phases are not the pipeline
          the agency actually runs, and showing two competing versions of
          "where are we" confused clients. The pipeline above is the answer;
          these are just the rooms where files and invoices live. */}
      {userProjects.length > 0 && (
        <section className="animate-fade-up">
          <div className="border-b border-border pb-3">
            <h2 className="text-[15px] font-bold tracking-tight">
              Campaign Workspaces
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Files, invoices and revision requests for each campaign.
            </p>
          </div>
          <ul className="divide-y divide-border border-b border-border">
            {userProjects.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {serviceLabels[project.serviceType] || project.serviceType}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      statusTone[project.status] || "text-orange"
                    }`}
                  >
                    {statusLabels[project.status] || project.status}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/campaigns/${project.id}`} className="group">
                      Open
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Nothing at all — no roster record and no campaign. */}
      {!rosterRecord && userProjects.length === 0 && (
        <div className="animate-fade-up rounded-xl border border-border">
          <EmptyState
            icon={FolderKanban}
            title="Your build hasn't started yet"
            description="Once the LGNDRY team onboards you, every step of your launch shows up here."
          />
        </div>
      )}
    </div>
  );
}
