import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientPackageEnum,
  clientStatusEnum,
  clientTasks,
  crmStageEnum,
  projects,
  revisionRequests,
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
    const { startDate, nextDueDate, ...rest } = parsed.data;

    const [updated] = await db
      .update(agencyClients)
      .set({
        ...rest,
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
    try {
      await publishToChannel("admin:crm", "update", { type: "client_updated" });
    } catch {}
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client update error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
