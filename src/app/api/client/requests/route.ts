import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientRequests, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { publishToChannel } from "@/lib/ably";
import { z } from "zod";

/**
 * Requests & Feedback — the client's own support channel.
 * GET  — their requests, newest first, with whatever the team replied.
 * POST — raise a new one. Not tied to a project: most clients are on a
 *        retainer with no project row and still need to ask for things.
 */

const createSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  details: z.string().trim().min(1).max(5000),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const rows = await db
      .select({
        id: clientRequests.id,
        subject: clientRequests.subject,
        details: clientRequests.details,
        status: clientRequests.status,
        adminNotes: clientRequests.adminNotes,
        createdAt: clientRequests.createdAt,
      })
      .from(clientRequests)
      .where(eq(clientRequests.userId, user.id))
      .orderBy(desc(clientRequests.createdAt))
      .limit(100);

    return NextResponse.json({ requests: rows });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client requests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const rate = checkRateLimit(user.id + ":client-requests", 10);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests — try again shortly." },
        { status: 429 }
      );
    }

    // Link it to their roster record when the portal login is connected, so
    // the team sees it on the client's detail panel.
    const [roster] = await db
      .select({ id: agencyClients.id, companyName: agencyClients.companyName })
      .from(agencyClients)
      .where(eq(agencyClients.userId, user.id));

    const [created] = await db
      .insert(clientRequests)
      .values({
        userId: user.id,
        clientId: roster?.id ?? null,
        subject: parsed.data.subject,
        details: parsed.data.details,
      })
      .returning();

    // Tell the team. A request nobody sees is worse than no request at all,
    // so this notifies every admin rather than a single assignee.
    try {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.role, ["admin", "project_manager"]));
      const who = roster?.companyName ?? user.email;
      await Promise.all(
        admins.map((a) =>
          createNotification({
            userId: a.id,
            type: "message_received",
            title: `New request from ${who}`,
            body: parsed.data.subject,
            actionUrl: roster ? `/admin/clients?open=${roster.id}` : "/admin/clients",
          })
        )
      );
    } catch (err) {
      console.error("Request notify failed:", err);
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "request_created" });
    } catch {}

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client request create error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
