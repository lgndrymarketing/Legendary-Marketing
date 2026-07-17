import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, projects, messages, leads, payments } from "@/db/schema";
import { count, eq, notInArray, sum } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";

/**
 * GET /api/admin/stats — real aggregate counts for the agency Overview.
 * Staff-only. Defensive against an empty DB (every value falls back to 0).
 */
export async function GET() {
  try {
    await requireStaff();

    const [
      [clientsRow],
      [activeProjectsRow],
      [totalMessagesRow],
      [unreadMessagesRow],
      [totalLeadsRow],
      [newLeadsRow],
      [revenueRow],
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, "client")),
      db
        .select({ value: count() })
        .from(projects)
        .where(notInArray(projects.status, ["completed", "cancelled"])),
      db.select({ value: count() }).from(messages),
      db
        .select({ value: count() })
        .from(messages)
        .where(eq(messages.read, false)),
      db.select({ value: count() }).from(leads),
      db
        .select({ value: count() })
        .from(leads)
        .where(eq(leads.status, "new")),
      // Revenue in cents — only completed payments count as recognized revenue.
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, "completed")),
    ]);

    return NextResponse.json({
      totalClients: clientsRow?.value ?? 0,
      activeProjects: activeProjectsRow?.value ?? 0,
      totalMessages: totalMessagesRow?.value ?? 0,
      unreadMessages: unreadMessagesRow?.value ?? 0,
      totalLeads: totalLeadsRow?.value ?? 0,
      newLeads: newLeadsRow?.value ?? 0,
      // sum() returns a numeric string or null — coerce to a cents integer.
      totalRevenue: Number(revenueRow?.value ?? 0),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
