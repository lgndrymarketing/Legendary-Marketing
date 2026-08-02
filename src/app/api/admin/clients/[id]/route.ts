import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  agencyClients,
  clientPackageEnum,
  clientStatusEnum,
  clientTasks,
  crmStageEnum,
  projects,
  revisionRequests,
  users,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";

const updateSchema = z
  .object({
    contactName: z.string().min(1).max(255).optional(),
    companyName: z.string().min(1).max(255).optional(),
    businessType: z.string().max(100).nullable().optional(),
    package: z.enum(clientPackageEnum.enumValues).optional(),
    packageLabel: z.string().max(100).nullable().optional(),
    saasPlan: z.string().max(100).nullable().optional(),
    email: z.string().email().nullable().optional(),
    driveUrl: z.string().max(1000).nullable().optional(),
    landingPageUrl: z.string().max(1000).nullable().optional(),
    stage: z.enum(crmStageEnum.enumValues).optional(),
    /** Email a fresh portal invite (used when the login email changes). */
    resendInvite: z.boolean().optional(),
    setupFee: z.number().int().min(0).optional(),
    monthlyFee: z.number().int().min(0).optional(),
    partnerCut: z.number().int().min(0).optional(),
    startDate: z.string().datetime().optional(),
    nextDueDate: z.string().datetime().nullable().optional(),
    status: z.enum(clientStatusEnum.enumValues).optional(),
    userId: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** GET /api/admin/clients/[id] — a client with its onboarding checklist and
 * any requests the client raised (revision requests on their project). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [client] = await db
      .select()
      .from(agencyClients)
      .where(eq(agencyClients.id, id));
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const tasks = await db
      .select()
      .from(clientTasks)
      .where(eq(clientTasks.clientId, id))
      .orderBy(asc(clientTasks.order), asc(clientTasks.createdAt));

    // Requests the client raised, via revision requests on their project.
    let requests: { id: string; description: string; status: string; createdAt: Date }[] = [];
    if (client.userId) {
      const projectRows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, client.userId));
      if (projectRows.length) {
        const rows = await db
          .select({
            id: revisionRequests.id,
            description: revisionRequests.description,
            status: revisionRequests.status,
            createdAt: revisionRequests.createdAt,
            projectId: revisionRequests.projectId,
          })
          .from(revisionRequests)
          .orderBy(desc(revisionRequests.createdAt));
        const projectIds = new Set(projectRows.map((p) => p.id));
        requests = rows
          .filter((r) => projectIds.has(r.projectId))
          .map((r) => ({
            id: r.id,
            description: r.description,
            status: r.status,
            createdAt: r.createdAt,
          }));
      }
    }

    return NextResponse.json({ client, tasks, requests });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/clients/[id] — remove a client (payments + tasks cascade). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(agencyClients)
      .where(eq(agencyClients.id, id))
      .returning({ id: agencyClients.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
      await publishToChannel("admin:crm", "update", { type: "client_deleted" });
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/clients/[id] — edit a client record. Admin-only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { startDate, nextDueDate, resendInvite, ...rest } = parsed.data;

    if (rest.email) rest.email = rest.email.trim().toLowerCase();

    const [existing] = await db
      .select({
        email: agencyClients.email,
        userId: agencyClients.userId,
        status: agencyClients.status,
      })
      .from(agencyClients)
      .where(eq(agencyClients.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const emailChanged =
      rest.email !== undefined && rest.email !== existing.email;

    // Same guard as creation: a staff/admin address can't double as a client
    // login (Clerk won't mint a second account, so the invite no-ops), and
    // linking the CRM record to a staff user would hand them the portal.
    if (emailChanged && rest.email) {
      const [clash] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.email, rest.email));
      if (clash && clash.role !== "client") {
        return NextResponse.json(
          {
            error:
              "That email already belongs to a team account. Use the client's own email so their portal invite works.",
          },
          { status: 409 }
        );
      }
    }

    const [updated] = await db
      .update(agencyClients)
      .set({
        ...rest,
        // Stamp/clear the churn date so churn can be reported per period.
        ...(rest.status !== undefined &&
          rest.status !== existing.status && {
            churnedAt: rest.status === "churned" ? new Date() : null,
          }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(nextDueDate !== undefined && {
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(agencyClients.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Re-point the portal link at the new address. The Clerk webhook only
    // links when userId IS NULL, so without this an already-onboarded
    // client keeps the OLD account and the new address lands in an empty
    // portal forever.
    if (emailChanged && updated.email) {
      const [existingUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, updated.email));
      // Point at the account that owns the new address, or clear the link
      // so the webhook can attach it when they accept the fresh invite.
      await db
        .update(agencyClients)
        .set({
          userId:
            existingUser && existingUser.role === "client"
              ? existingUser.id
              : null,
          updatedAt: new Date(),
        })
        .where(eq(agencyClients.id, id));
    }

    // A new login email needs a fresh invite — the old address's invitation
    // no longer maps to this client. Best-effort: never fail the save.
    let inviteStatus: "sent" | "failed" | undefined;
    if (updated.email && (resendInvite || emailChanged)) {
      inviteStatus = "failed";
      try {
        const cc = await clerkClient();
        await cc.invitations.createInvitation({
          emailAddress: updated.email,
          ignoreExisting: true,
        });
        inviteStatus = "sent";
      } catch (err) {
        console.error("Client invite failed:", err);
      }
    }

    try {
      await publishToChannel("admin:crm", "update", { type: "client_updated" });
    } catch {}
    return NextResponse.json({ ...updated, inviteStatus });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client update error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
