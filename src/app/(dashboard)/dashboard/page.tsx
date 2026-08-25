import { currentUser } from "@clerk/nextjs/server";
import { PageHero } from "@/components/ui/firecrawl";
import { PerformanceOverview } from "@/components/dashboard/performance-overview";
import { LaunchPipeline } from "@/components/dashboard/launch-pipeline";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <PageHero
        title="Performance Dashboard"
        description={`Welcome back, ${
          user.firstName || "there"
        } — track your campaign performance and ROI.`}
      />

      {/* Launch pipeline — the client's onboarding progress (transparency
          mirror of the admin Client CRM). Hidden until they have a record. */}
      <LaunchPipeline />

      {/* Performance Dashboard — campaign results and ROI */}
      <PerformanceOverview />
    </div>
  );
}
