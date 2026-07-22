import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientTasks, users } from "@/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * GET /api/admin/client-tasks — the Task Manager feed: every onboarding/
 * custom task across all clients (joined with the client's company name),
 * plus the client roster and staff list for the create-task and assignee
 * pickers.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [taskRows, clients, staff] = await Promise.all([
      db
        .select({
          id: clientTasks.id,
          clientId: clientTasks.clientId,
          title: clientTasks.title,
          department: clientTasks.department,
          stage: clientTasks.stage,
          status: clientTasks.status,
          priority: clientTasks.priority,
          assigneeId: clientTasks.assigneeId,
          assigneeName: clientTasks.assigneeName,
          order: clientTasks.order,
          dueDate: clientTasks.dueDate,
          companyName: agencyClients.companyName,
          clientStatus: agencyClients.status,
        })
        .from(clientTasks)
        .leftJoin(agencyClients, eq(clientTasks.clientId, agencyClients.id))
        .orderBy(desc(agencyClients.createdAt), asc(clientTasks.order)),
      db
        .select({
          id: agencyClients.id,
          companyName: agencyClients.companyName,
          status: agencyClients.status,
        })
        .from(agencyClients)
        .orderBy(asc(agencyClients.companyName)),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.role, ["admin", "project_manager", "va"]))
        .orderBy(asc(users.createdAt)),
    ]);

    return NextResponse.json({
      tasks: taskRows,
      clients,
      staff: staff.map((s) => ({
        id: s.id,
        name: s.firstName || s.email.split("@")[0],
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client tasks feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
