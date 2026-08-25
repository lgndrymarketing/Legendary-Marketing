import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, messages, users } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { publishToChannel } from "@/lib/ably";
import { z } from "zod";

/**
 * The client's message thread with the team. Scoped to their roster record,
 * not a project: most clients are on a retainer with no project row, and the
 * project-scoped thread was unreachable for them.
 */

const sendSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

async function ownClient(userId: string) {
  const [client] = await db
    .select({ id: agencyClients.id, companyName: agencyClients.companyName })
    .from(agencyClients)
    .where(eq(agencyClients.userId, userId));
  return client ?? null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const client = await ownClient(user.id);
    // No roster record yet — an empty thread, not an error.
    if (!client) return NextResponse.json({ messages: [], ready: false });

    const thread = await db
      .select({
        id: messages.id,
        content: messages.content,
        role: messages.role,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.clientId, client.id))
      .orderBy(asc(messages.createdAt))
      .limit(200);

    return NextResponse.json({ messages: thread, ready: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const client = await ownClient(user.id);
    if (!client) {
      return NextResponse.json(
        { error: "Your account isn't linked to a client record yet." },
        { status: 404 }
      );
    }

    const parsed = sendSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const rate = checkRateLimit(user.id + ":client-messages", 30);
    if (!rate.success) {
      return NextResponse.json({ error: "Too many messages" }, { status: 429 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        clientId: client.id,
        senderId: user.id,
        role: "client",
        content: parsed.data.content,
      })
      .returning();

    // Notify the team — there's no single assignee on a client, so this
    // reaches everyone who works the roster.
    try {
      const staff = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.role, ["admin", "project_manager"]));
      await Promise.all(
        staff.map((m) =>
          createNotification({
            userId: m.id,
            type: "message_received",
            title: `New message from ${client.companyName}`,
            body: parsed.data.content.slice(0, 140),
            actionUrl: `/admin/messages?client=${client.id}`,
          })
        )
      );
    } catch (err) {
      console.error("Message notify failed:", err);
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "message_sent" });
    } catch {}

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
