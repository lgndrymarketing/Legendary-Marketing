import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, tasks, projects, users } from "@/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * GET /api/admin/dashboard — the operational admin overview. Admin-only.
 * Non-financial: client roster counts, a 6-month new-clients trend, and the
 * open high-priority task queue across every campaign. The agency P&L stays
 * on the Financials tab.
 */

const MONTHS_SHOWN = 6;

export async function GET() {
  try {
    await requireAdmin();

    const [rosterRows, highTasks] = await Promise.all([
      db
        .select({
          startDate: agencyClients.startDate,
          status: agencyClients.status,
        })
        .from(agencyClients),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          createdAt: tasks.createdAt,
          projectName: projects.name,
          assigneeFirst: users.firstName,
          assigneeEmail: users.email,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(and(eq(tasks.priority, "high"), ne(tasks.status, "done")))
        .orderBy(desc(tasks.createdAt))
        .limit(50),
    ]);

    const activeClients = rosterRows.filter((c) => c.status === "active").length;
    const pausedCanceled = rosterRows.filter(
      (c) => c.status === "paused" || c.status === "churned"
    ).length;

    // Trailing month buckets, oldest → newest.
    const now = new Date();
    const buckets = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_SHOWN - 1 - i), 1)
      );
      return {
        key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
        label: d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    });
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    const newClientsSeries = buckets.map(() => 0);
    for (const c of rosterRows) {
      const d = new Date(c.startDate);
      const i = bucketIndex.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      if (i !== undefined) newClientsSeries[i]++;
    }

    const highPriorityTasks = highTasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectName: t.projectName ?? "—",
      assigneeName: t.assigneeFirst || t.assigneeEmail?.split("@")[0] || "Unassigned",
      priority: t.priority,
    }));

    return NextResponse.json({
      activeClients,
      pausedCanceled,
      highPriorityTaskCount: highPriorityTasks.length,
      months: buckets.map((b) => b.label),
      newClientsSeries,
      highPriorityTasks: highPriorityTasks.slice(0, 8),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
