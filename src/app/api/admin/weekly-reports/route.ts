import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, weeklyReports } from "@/db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";
import { createNotification } from "@/lib/notifications";

/**
 * Agency Data Entry — the agency half of the weekly reporting loop.
 * GET  — recent entries (joined with client names) + the client roster for
 *        the picker. Staff-accessible: data entry is an operations job.
 * POST — record a week's leads + CPL for a client. The week is the 7 days
 *        ending on the picked date; total spend = leads × CPL; the report is
 *        created as "pending_client" until the client adds closes + revenue.
 * Money in cents.
 */

const createSchema = z.object({
  clientId: z.string().uuid(),
  weekEnding: z.string().datetime(),
  leads: z.number().int().min(0).max(1_000_000),
  cpl: z.number().int().min(0).max(100_000_000),
});

export async function GET() {
  try {
    await requireStaff();

    const [reports, clients] = await Promise.all([
      db
        .select({
          id: weeklyReports.id,
          clientId: weeklyReports.clientId,
          companyName: agencyClients.companyName,
          weekStart: weeklyReports.weekStart,
          weekEnd: weeklyReports.weekEnd,
          leads: weeklyReports.leads,
          cpl: weeklyReports.cpl,
          totalSpend: weeklyReports.totalSpend,
          closes: weeklyReports.closes,
          revenue: weeklyReports.revenue,
          status: weeklyReports.status,
        })
        .from(weeklyReports)
        .leftJoin(agencyClients, eq(weeklyReports.clientId, agencyClients.id))
        .orderBy(desc(weeklyReports.weekEnd))
        .limit(100),
      db
        .select({
          id: agencyClients.id,
          companyName: agencyClients.companyName,
          status: agencyClients.status,
        })
        .from(agencyClients)
        .orderBy(asc(agencyClients.companyName)),
    ]);

    return NextResponse.json({ reports, clients });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Weekly reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid report", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { clientId, weekEnding, leads, cpl } = parsed.data;

    const [client] = await db
      .select({ id: agencyClients.id, userId: agencyClients.userId })
      .from(agencyClients)
      .where(eq(agencyClients.id, clientId));
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // The week is the 7 days ending on the picked date (inclusive).
    const end = new Date(weekEnding);
    const weekEnd = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
    );
    const weekStart = new Date(weekEnd.getTime() - 6 * 86_400_000);

    // One report per client per week — replace the agency numbers if the
    // same week is re-entered (a correction), keeping any client answers.
    const [existing] = await db
      .select({ id: weeklyReports.id })
      .from(weeklyReports)
      .where(
        and(
          eq(weeklyReports.clientId, clientId),
          gte(weeklyReports.weekEnd, weekEnd),
          lte(weeklyReports.weekEnd, weekEnd)
        )
      );

    const totalSpend = leads * cpl;
    let report;
    if (existing) {
      [report] = await db
        .update(weeklyReports)
        .set({ leads, cpl, totalSpend, updatedAt: new Date() })
        .where(eq(weeklyReports.id, existing.id))
        .returning();
    } else {
      [report] = await db
        .insert(weeklyReports)
        .values({
          clientId,
          weekStart,
          weekEnd,
          leads,
          cpl,
          totalSpend,
          status: "pending_client",
          createdBy: staff.id,
        })
        .returning();
    }

    // Nudge the client portal (best-effort).
    if (client.userId) {
      try {
        await createNotification({
          userId: client.userId,
          type: "phase_update",
          title: "Weekly report ready",
          body: "Your latest ad results are in — add your closes and revenue to complete the report.",
          actionUrl: "/reports",
        });
      } catch {}
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "report_saved" });
    } catch {}

    return NextResponse.json(report, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Weekly report create error:", error);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}
