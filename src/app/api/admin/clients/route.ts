import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  agencyClients,
  clientPackageEnum,
  clientStatusEnum,
  clientTasks,
  projects,
  users,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { pickPartners } from "@/lib/partners";
import { z } from "zod";
import { DEFAULT_TASKS } from "@/lib/crm";
import { publishToChannel } from "@/lib/ably";

/**
 * Agency client roster + Client CRM. Admin-only.
 * GET  — all clients (newest first) with pipeline stage, onboarding task
 *        progress, and the linked portal account/project, plus portal accounts
 *        available for linking and the admin partner list.
 * POST — create a client: seeds the 15-step onboarding checklist routed to the
 *        four departments and emails a Clerk portal invitation. Fees in cents.
 */

const clientSchema = z.object({
  contactName: z.string().min(1).max(255),
  companyName: z.string().min(1).max(255),
  businessType: z.string().max(100).optional(),
  package: z.enum(clientPackageEnum.enumValues).optional(),
  packageLabel: z.string().max(100).nullable().optional(),
  saasPlan: z.string().max(100).nullable().optional(),
  driveUrl: z.string().max(1000).nullable().optional(),
  landingPageUrl: z.string().max(1000).nullable().optional(),
  email: z.string().email().optional(),
  setupFee: z.number().int().min(0).default(0),
  monthlyFee: z.number().int().min(0).default(0),
  partnerCut: z.number().int().min(0).default(0),
  startDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime().nullable().optional(),
  status: z.enum(clientStatusEnum.enumValues).default("active"),
  userId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const [clientRows, portalUsers, admins, staff, taskRows] =
      await Promise.all([
        db.select().from(agencyClients).orderBy(desc(agencyClients.createdAt)),
        db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.role, "client")),
        db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.role, "admin"))
          .orderBy(users.createdAt),
        db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          })
          .from(users),
        db
          .select({
            clientId: clientTasks.clientId,
            status: clientTasks.status,
          })
          .from(clientTasks),
      ]);

    // Onboarding progress per client.
    const progress = new Map<string, { total: number; done: number }>();
    for (const t of taskRows) {
      const p = progress.get(t.clientId) ?? { total: 0, done: 0 };
      p.total += 1;
      if (t.status === "completed") p.done += 1;
      progress.set(t.clientId, p);
    }

    // Linked portal accounts → their email + first project (for View Portal).
    const usersById = new Map(staff.map((u) => [u.id, u]));
    const projectRows = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects);
    const projectByUser = new Map<string, string>();
    for (const p of projectRows) {
      if (!projectByUser.has(p.userId)) projectByUser.set(p.userId, p.id);
    }

    const clients = clientRows.map((c) => {
      const linked = c.userId ? usersById.get(c.userId) : undefined;
      const prog = progress.get(c.id) ?? { total: 0, done: 0 };
      return {
        ...c,
        // "industry" is the client-facing label for businessType.
        industry: c.businessType,
        portalEmail: linked?.email ?? c.email ?? null,
        projectId: c.userId ? projectByUser.get(c.userId) ?? null : null,
        tasksTotal: prog.total,
        tasksDone: prog.done,
      };
    });

    return NextResponse.json({
      clients,
      portalUsers,
      // Payment receivers = the ledger partners (Uri & Duke), not every
      // admin — a payment received by a non-partner would silently fall
      // out of the split math.
      admins: pickPartners(admins).map((a) => ({
        id: a.id,
        name: a.firstName || a.email.split("@")[0],
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Clients fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = clientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid client", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { startDate, nextDueDate, email, ...rest } = parsed.data;

    const [created] = await db
      .insert(agencyClients)
      .values({
        ...rest,
        email: email ?? null,
        startDate: startDate ? new Date(startDate) : new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        createdBy: admin.id,
      })
      .returning();

    // Seed the default onboarding checklist, routing each task to the live
    // staff member by first name.
    const staff = await db
      .select({ id: users.id, firstName: users.firstName })
      .from(users);
    const idByName = new Map(
      staff
        .filter((s) => s.firstName)
        .map((s) => [s.firstName as string, s.id])
    );
    await db.insert(clientTasks).values(
      DEFAULT_TASKS.map((t, i) => ({
        clientId: created.id,
        title: t.title,
        department: t.department,
        stage: t.stage,
        priority: t.priority,
        assigneeId: idByName.get(t.assignee) ?? null,
        assigneeName: t.assignee,
        order: i,
      }))
    );

    // Email a portal invitation (best-effort — never block client creation).
    let inviteStatus: "sent" | "skipped" | "failed" = "skipped";
    if (email) {
      try {
        const cc = await clerkClient();
        await cc.invitations.createInvitation({
          emailAddress: email,
          ignoreExisting: true,
        });
        inviteStatus = "sent";
      } catch (err) {
        console.error("Portal invite failed:", err);
        inviteStatus = "failed";
      }
    }

    try {
      await publishToChannel("admin:crm", "update", { type: "client_created" });
    } catch {}

    return NextResponse.json({ ...created, inviteStatus }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client create error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
