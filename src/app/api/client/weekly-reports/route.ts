import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, weeklyReports } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";

/**
 * Client half of the weekly reporting loop — scoped to the caller's own
 * agency-client record (matched by linked userId).
 * GET   — all their reports, newest week first.
 * PATCH — complete a pending report with closes + revenue (cents). Only the
 *         client's own pending reports can be completed.
 */

const completeSchema = z.object({
  reportId: z.string().uuid(),
  closes: z.number().int().min(0).max(1_000_000),
  revenue: z.number().int().min(0).max(10_000_000_000),
});

async function ownClient(userId: string) {
  const [client] = await db
    .select({ id: agencyClients.id })
    .from(agencyClients)
    .where(eq(agencyClients.userId, userId));
  return client ?? null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const client = await ownClient(user.id);
    if (!client) return NextResponse.json({ reports: [] });

    const reports = await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.clientId, client.id))
      .orderBy(desc(weeklyReports.weekEnd));

    return NextResponse.json({ reports });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const client = await ownClient(user.id);
    if (!client) {
      return NextResponse.json({ error: "No client record" }, { status: 404 });
    }

    const parsed = completeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }
    const { reportId, closes, revenue } = parsed.data;

    const [updated] = await db
      .update(weeklyReports)
      .set({
        closes,
        revenue,
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(weeklyReports.id, reportId),
          eq(weeklyReports.clientId, client.id),
          eq(weeklyReports.status, "pending_client")
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await publishToChannel("admin:crm", "update", {
        type: "report_completed",
      });
    } catch {}

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client report complete error:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
