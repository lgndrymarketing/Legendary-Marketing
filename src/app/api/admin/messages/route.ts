import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, messages } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";
import { createNotification } from "@/lib/notifications";
import { publishToChannel } from "@/lib/ably";
import { z } from "zod";

/**
 * The team's side of the client threads.
 * GET             — every roster client with their last message and how many
 *                   of their messages are still unread by the team.
 * GET ?clientId=  — one thread, marked read on open.
 * POST            — reply to a client. Staff-accessible.
 */

const sendSchema = z.object({
  clientId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});

export async function GET(req: Request) {
  try {
    await requireStaff();
    const clientId = new URL(req.url).searchParams.get("clientId");

    if (clientId) {
      if (!z.string().uuid().safeParse(clientId).success) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const thread = await db
        .select({
          id: messages.id,
          content: messages.content,
          role: messages.role,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.clientId, clientId))
        .orderBy(asc(messages.createdAt))
        .limit(200);

      // Opening the thread is reading it — clears the unread badge. Scoped
      // to unread rows: the page polls this endpoint, and an unconditional
      // update would write every row of the thread every few seconds.
      await db
        .update(messages)
        .set({ read: true })
        .where(and(eq(messages.clientId, clientId), eq(messages.read, false)));

      return NextResponse.json({ messages: thread });
    }

    const [clients, allMessages] = await Promise.all([
      db
        .select({
          id: agencyClients.id,
          companyName: agencyClients.companyName,
          contactName: agencyClients.contactName,
          status: agencyClients.status,
        })
        .from(agencyClients)
        .orderBy(desc(agencyClients.createdAt)),
      db
        .select({
          clientId: messages.clientId,
          content: messages.content,
          role: messages.role,
          read: messages.read,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .orderBy(asc(messages.createdAt)),
    ]);

    // Last message + unread count per client, in one pass over the rows.
    const last = new Map<string, { content: string; createdAt: Date }>();
    const unread = new Map<string, number>();
    for (const m of allMessages) {
      if (!m.clientId) continue;
      last.set(m.clientId, { content: m.content, createdAt: m.createdAt });
      if (m.role === "client" && !m.read) {
        unread.set(m.clientId, (unread.get(m.clientId) ?? 0) + 1);
      }
    }

    const threads = clients
      .map((c) => ({
        ...c,
        lastMessage: last.get(c.id)?.content ?? null,
        lastAt: last.get(c.id)?.createdAt ?? null,
        unread: unread.get(c.id) ?? 0,
      }))
      // Clients who have written come first, newest first; the rest follow
      // alphabetically so starting a new thread is still one search away.
      .sort((a, b) => {
        if (a.lastAt && b.lastAt) return b.lastAt > a.lastAt ? 1 : -1;
        if (a.lastAt) return -1;
        if (b.lastAt) return 1;
        return a.companyName.localeCompare(b.companyName);
      });

    return NextResponse.json({ threads });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();

    const parsed = sendSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    const { clientId, content } = parsed.data;

    const [client] = await db
      .select({ userId: agencyClients.userId })
      .from(agencyClients)
      .where(eq(agencyClients.id, clientId));
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        clientId,
        senderId: staff.id,
        role: "admin",
        content,
        // Staff replies are already read by the team that wrote them.
        read: true,
      })
      .returning();

    // Only reaches them once their portal login exists.
    if (client.userId) {
      try {
        await createNotification({
          userId: client.userId,
          type: "message_received",
          title: "New message from your team",
          body: content.slice(0, 140),
          actionUrl: "/messages",
        });
      } catch (err) {
        console.error("Message notify failed:", err);
      }
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "message_sent" });
    } catch {}

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
