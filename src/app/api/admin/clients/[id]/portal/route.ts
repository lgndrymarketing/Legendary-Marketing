import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientTasks,
  weeklyReports,
  projects,
  projectPhases,
  adCampaigns,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { CRM_STAGES, STAGE_LABELS, stageFromTasks, type CrmStage } from "@/lib/crm";

/**
 * GET /api/admin/clients/[id]/portal — a read-only snapshot of exactly what
 * this client sees in their portal: launch pipeline, weekly reports (with
 * the same ROAS math the portal runs), project phases, and ad campaigns.
 * Admin-only. Works whether or not a portal login is linked yet — the
 * pipeline exists from the moment the client is created.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [client] = await db
      .select()
      .from(agencyClients)
      .where(eq(agencyClients.id, id));
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [tasks, reports] = await Promise.all([
      db
        .select({
          id: clientTasks.id,
          title: clientTasks.title,
          status: clientTasks.status,
          stage: clientTasks.stage,
          order: clientTasks.order,
        })
        .from(clientTasks)
        .where(eq(clientTasks.clientId, id))
        .orderBy(asc(clientTasks.order)),
      db
        .select()
        .from(weeklyReports)
        .where(eq(weeklyReports.clientId, id))
        .orderBy(desc(weeklyReports.weekEnd)),
    ]);

    // Linked portal project (may not exist yet).
    let project = null as
      | { id: string; name: string; status: string; serviceType: string }
      | null;
    let phases: { id: string; name: string; status: string; order: number }[] = [];
    let campaigns: {
      id: string;
      name: string;
      platform: string;
      status: string;
      leadsGenerated: number;
      totalSpend: number;
    }[] = [];
    if (client.userId) {
      const [p] = await db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          serviceType: projects.serviceType,
        })
        .from(projects)
        .where(eq(projects.userId, client.userId))
        .limit(1);
      if (p) {
        project = p;
        [phases, campaigns] = await Promise.all([
          db
            .select({
              id: projectPhases.id,
              name: projectPhases.name,
              status: projectPhases.status,
              order: projectPhases.order,
            })
            .from(projectPhases)
            .where(eq(projectPhases.projectId, p.id))
            .orderBy(asc(projectPhases.order)),
          db
            .select({
              id: adCampaigns.id,
              name: adCampaigns.name,
              platform: adCampaigns.platform,
              status: adCampaigns.status,
              leadsGenerated: adCampaigns.leadsGenerated,
              totalSpend: adCampaigns.totalSpend,
            })
            .from(adCampaigns)
            .where(eq(adCampaigns.projectId, p.id)),
        ]);
      }
    }

    // Same pipeline model the client's LaunchPipeline renders.
    // Prefer the checklist-derived stage, but fall back to the persisted
    // one (an admin may have dragged the card on the board) so this mirror
    // agrees with what the client's own dashboard shows.
    const currentStage =
      (tasks.length ? stageFromTasks(tasks) : null) ??
      (client.stage as CrmStage);
    const currentIndex = CRM_STAGES.indexOf(currentStage);
    const stages = CRM_STAGES.map((key, i) => ({
      key,
      label: STAGE_LABELS[key],
      complete: i < currentIndex,
      active: i === currentIndex,
    }));

    // Same all-time totals the portal's Weekly Reports page computes.
    const completed = reports.filter((r) => r.status === "completed");
    const totalLeads = completed.reduce((s, r) => s + r.leads, 0);
    const totalSpend = completed.reduce((s, r) => s + r.totalSpend, 0);
    const totalRevenue = completed.reduce((s, r) => s + (r.revenue ?? 0), 0);

    return NextResponse.json({
      client: {
        id: client.id,
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        status: client.status,
        package: client.packageLabel ?? client.package,
        driveUrl: client.driveUrl,
        landingPageUrl: client.landingPageUrl,
        hasPortalLogin: !!client.userId,
      },
      pipeline: {
        stageLabel: STAGE_LABELS[currentStage],
        total: tasks.length,
        done: tasks.filter((t) => t.status === "completed").length,
        stages,
      },
      reports,
      totals: {
        totalLeads,
        totalSpend,
        totalRevenue,
        avgCpl: totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        pending: reports.filter((r) => r.status === "pending_client").length,
      },
      project,
      phases,
      campaigns,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client portal preview error:", error);
    return NextResponse.json(
      { error: "Failed to load portal view" },
      { status: 500 }
    );
  }
}
