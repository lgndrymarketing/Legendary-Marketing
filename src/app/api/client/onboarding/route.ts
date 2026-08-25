import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientTasks } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { CRM_STAGES, STAGE_LABELS, type CrmStage } from "@/lib/crm";

/**
 * GET /api/client/onboarding — the signed-in client's launch pipeline: their
 * current stage, checklist progress, per-step completion, and the shared
 * assets the team linked (drive folder, landing page, plan). Read-only
 * transparency mirror of the admin Client CRM (each step's status is whatever
 * the team set). Returns { empty: true } when the client has no roster record.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const [client] = await db
      .select({
        id: agencyClients.id,
        stage: agencyClients.stage,
        companyName: agencyClients.companyName,
        driveUrl: agencyClients.driveUrl,
        landingPageUrl: agencyClients.landingPageUrl,
        saasPlan: agencyClients.saasPlan,
        package: agencyClients.package,
        packageLabel: agencyClients.packageLabel,
      })
      .from(agencyClients)
      .where(eq(agencyClients.userId, user.id));

    if (!client) return NextResponse.json({ empty: true });

    const tasks = await db
      .select({
        id: clientTasks.id,
        title: clientTasks.title,
        status: clientTasks.status,
        stage: clientTasks.stage,
        department: clientTasks.department,
        order: clientTasks.order,
      })
      .from(clientTasks)
      .where(eq(clientTasks.clientId, client.id))
      .orderBy(asc(clientTasks.order), asc(clientTasks.createdAt));

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "completed").length;

    // Which pipeline stages are fully complete (for the stepper view).
    const stages = CRM_STAGES.map((s) => {
      const stageTasks = tasks.filter((t) => t.stage === s);
      const complete =
        stageTasks.length > 0 &&
        stageTasks.every((t) => t.status === "completed");
      const active = s === client.stage;
      return { key: s, label: STAGE_LABELS[s as CrmStage], complete, active };
    });

    return NextResponse.json({
      stage: client.stage,
      stageLabel: STAGE_LABELS[client.stage as CrmStage],
      total,
      done,
      stages,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        stage: t.stage,
      })),
      // Shared assets — surfaced on the client's Project page. Null means the
      // team hasn't linked it yet, which the UI states plainly.
      assets: {
        driveUrl: client.driveUrl,
        landingPageUrl: client.landingPageUrl,
        plan:
          client.saasPlan ??
          (client.package === "custom"
            ? client.packageLabel
            : client.package
              ? client.package[0].toUpperCase() + client.package.slice(1)
              : null),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to load onboarding" },
      { status: 500 }
    );
  }
}
