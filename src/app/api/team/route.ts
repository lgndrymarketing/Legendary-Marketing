import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, userRoles, tasks, files, messages } from "@/db/schema";
import { eq, ne, count } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-utils";

const DEPARTMENTS = ["csm", "funnel", "automations", "ads"] as const;

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const includeClients = searchParams.get("includeClients") === "true";

    const results = includeClients
      ? await db.select().from(users).limit(200)
      : await db.select().from(users).where(ne(users.role, "client"));

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

const createSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email(),
  role: z.enum(userRoles).default("project_manager"),
  department: z.enum(DEPARTMENTS).nullable().optional(),
});

/**
 * POST /api/team — add a team member. Seeds a staff user with a placeholder
 * "invite:<email>" clerkId (reconciled to the real account on signup) and
 * emails a Clerk invitation. New members are immediately assignable across
 * the Client CRM.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { firstName, lastName, email, role, department } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(users)
      .values({
        clerkId: `invite:${normalizedEmail}`,
        email: normalizedEmail,
        firstName,
        lastName: lastName || null,
        role,
        department: department ?? null,
      })
      .returning();

    let inviteStatus: "sent" | "failed" = "failed";
    try {
      const cc = await clerkClient();
      await cc.invitations.createInvitation({
        emailAddress: normalizedEmail,
        ignoreExisting: true,
      });
      inviteStatus = "sent";
    } catch (err) {
      console.error("Team invite failed:", err);
    }

    return NextResponse.json({ ...created, inviteStatus }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team create error:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(userRoles).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).nullable().optional(),
  email: z.string().email().optional(),
  department: z.enum(DEPARTMENTS).nullable().optional(),
  resendInvite: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, role, resendInvite, email, ...rest } = parsed.data;

    if (userId === admin.id && role && role !== "admin") {
      return NextResponse.json(
        { error: "You can't demote yourself" },
        { status: 400 }
      );
    }

    // Guard against locking the agency out: if this change demotes the last
    // admin, block it.
    if (role && role !== "admin") {
      const [target] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId));
      if (target?.role === "admin") {
        const [{ value: adminCount }] = await db
          .select({ value: count() })
          .from(users)
          .where(eq(users.role, "admin"));
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "There must be at least one admin." },
            { status: 400 }
          );
        }
      }
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const [updated] = await db
      .update(users)
      .set({
        ...rest,
        ...(role && { role }),
        ...(normalizedEmail && { email: normalizedEmail }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let inviteStatus: "sent" | "failed" | undefined;
    if (resendInvite && updated.email) {
      inviteStatus = "failed";
      try {
        const cc = await clerkClient();
        await cc.invitations.createInvitation({
          emailAddress: updated.email,
          ignoreExisting: true,
        });
        inviteStatus = "sent";
      } catch (err) {
        console.error("Resend invite failed:", err);
      }
    }

    return NextResponse.json({ ...updated, inviteStatus });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team update error:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({ userId: z.string().uuid() });

/**
 * DELETE /api/team — remove a team member. Guard rails:
 * - You can't delete yourself.
 * - Admins can't be deleted directly (demote first — the PATCH last-admin
 *   guard then applies), which also protects the ledger partners and every
 *   admin-owned financial record from cascading away.
 * - Their authored records are reassigned to the acting admin before the
 *   row is removed (messages, uploaded files, created tasks would otherwise
 *   cascade-delete and erase client-facing history). Checklist assignments
 *   fall back to the denormalized assignee name automatically.
 * - Best-effort Clerk cleanup so the login stops working too.
 */
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { userId } = parsed.data;

    if (userId === admin.id) {
      return NextResponse.json(
        { error: "You can't remove yourself." },
        { status: 400 }
      );
    }

    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Demote this admin to another role before removing them." },
        { status: 400 }
      );
    }

    // Keep client-facing history: hand authored records to the acting admin
    // instead of letting the FK cascades erase them.
    await db
      .update(tasks)
      .set({ createdBy: admin.id })
      .where(eq(tasks.createdBy, userId));
    await db
      .update(files)
      .set({ uploadedBy: admin.id })
      .where(eq(files.uploadedBy, userId));
    await db
      .update(messages)
      .set({ senderId: admin.id })
      .where(eq(messages.senderId, userId));

    await db.delete(users).where(eq(users.id, userId));

    // Best-effort: kill the login too (real accounts only; invite
    // placeholders never had one).
    let clerkStatus: "removed" | "skipped" | "failed" = "skipped";
    if (!target.clerkId.startsWith("invite:") && !target.clerkId.startsWith("seed_")) {
      try {
        const cc = await clerkClient();
        await cc.users.deleteUser(target.clerkId);
        clerkStatus = "removed";
      } catch (err) {
        console.error("Clerk user delete failed:", err);
        clerkStatus = "failed";
      }
    }

    return NextResponse.json({ ok: true, clerkStatus });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
