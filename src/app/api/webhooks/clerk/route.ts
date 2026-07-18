import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/db";
import { users, agencyClients } from "@/db/schema";
import { and, eq, isNull, like } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { isGhlConfigured, syncContactToGhl } from "@/lib/ghl";

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateLimit = checkRateLimit(`clerk-webhook:${ip}`, 100, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Verify webhook signature
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing svix headers" },
        { status: 401 }
      );
    }

    const rawBody = await req.text();

    const wh = new Webhook(secret);
    let payload: { type: string; data: Record<string, unknown> };

    try {
      payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof payload;
    } catch {
      console.error("Clerk webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const { type, data } = payload;

    if (type === "user.created") {
      const email =
        (
          data.email_addresses as Array<{ email_address: string }>
        )?.[0]?.email_address ?? "";
      const firstName = data.first_name as string | undefined;
      const lastName = data.last_name as string | undefined;

      // Reconcile an invited placeholder account: team members (and any
      // pre-provisioned user) are seeded with a clerkId of "invite:<email>".
      // When they accept the Clerk invite and sign up, swap in the real
      // clerkId on that same row so their role/department are preserved
      // instead of creating a duplicate client row.
      let created;
      const [placeholder] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.email, email),
            like(users.clerkId, "invite:%")
          )
        );
      if (placeholder) {
        [created] = await db
          .update(users)
          .set({
            clerkId: data.id as string,
            firstName,
            lastName,
            imageUrl: data.image_url as string | undefined,
            updatedAt: new Date(),
          })
          .where(eq(users.id, placeholder.id))
          .returning();
      } else {
        // Idempotent: svix retries the same event, so upsert on the unique
        // clerkId instead of a bare insert (which would 500 and retry-loop).
        [created] = await db
          .insert(users)
          .values({
            clerkId: data.id as string,
            email,
            firstName,
            lastName,
            imageUrl: data.image_url as string | undefined,
            role: "client",
          })
          .onConflictDoUpdate({
            target: users.clerkId,
            set: {
              email,
              firstName,
              lastName,
              imageUrl: data.image_url as string | undefined,
              updatedAt: new Date(),
            },
          })
          .returning();
      }

      // Link the client's CRM roster record (created from the admin invite)
      // to their new portal account by email, so their onboarding pipeline
      // shows up on their dashboard.
      if (email) {
        await db
          .update(agencyClients)
          .set({ userId: created.id, updatedAt: new Date() })
          .where(
            and(eq(agencyClients.email, email), isNull(agencyClients.userId))
          );
      }

      // GHL is the agency's CRM of record — mirror every new portal signup
      // as a GHL contact. Best-effort: a GHL failure must never fail the
      // webhook (the user row above is already committed). Skip if this
      // upsert was a retry of an already-synced contact.
      if (isGhlConfigured() && email && !created.ghlContactId) {
        try {
          const ghlContactId = await syncContactToGhl({
            email,
            firstName,
            lastName,
            tags: ["client-portal"],
            source: "client_portal_signup",
          });
          await db
            .update(users)
            .set({ ghlContactId, updatedAt: new Date() })
            .where(eq(users.id, created.id));
        } catch (ghlError) {
          console.error("GHL contact sync failed (user still created):", ghlError);
        }
      }
    }

    if (type === "user.updated") {
      await db
        .update(users)
        .set({
          email: (
            data.email_addresses as Array<{ email_address: string }>
          )?.[0]?.email_address,
          firstName: data.first_name as string | undefined,
          lastName: data.last_name as string | undefined,
          imageUrl: data.image_url as string | undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, data.id as string));
    }

    if (type === "user.deleted") {
      await db.delete(users).where(eq(users.clerkId, data.id as string));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
