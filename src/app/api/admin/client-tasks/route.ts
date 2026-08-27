import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientStatusEnum,
  clientTaskPriorityEnum,
  clientTasks,
  departmentEnum,
  users,
} from "@/db/schema";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * GET /api/admin/client-tasks — the Task Manager feed.
 *
 * Filtering, sorting and paging all happen in Postgres. The roster carries
 * thousands of checklist tasks (15 seeded per client), and shipping every one
 * of them to the browser to filter there froze the page on open — the payload
 * alone, before a single row rendered. One page is ~25 rows.
 *
 * Also returns the client roster and staff list for the filter and
 * create-task pickers; both are small and change rarely.
 */

const STATUSES = ["pending", "in_progress", "completed"] as const;
const SORTS = [
  "default",
  "due_soon",
  "priority",
  "status",
  "client",
] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(0).max(10_000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  dept: z.enum(departmentEnum.enumValues).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(clientTaskPriorityEnum.enumValues).optional(),
  assignee: z.string().uuid().optional(),
  clientStatus: z.enum(clientStatusEnum.enumValues).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(SORTS).default("default"),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    // Blank values arrive as "" from the UI; drop them so the enums don't
    // reject an absent filter.
    for (const k of Object.keys(raw)) {
      if (raw[k] === "" || raw[k] === "all") delete raw[k];
    }
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }
    const { page, pageSize, dept, status, priority, assignee, clientStatus, q, sort } =
      parsed.data;

    const search = q?.trim();
    const filters = [
      dept ? eq(clientTasks.department, dept) : undefined,
      status ? eq(clientTasks.status, status) : undefined,
      priority ? eq(clientTasks.priority, priority) : undefined,
      assignee ? eq(clientTasks.assigneeId, assignee) : undefined,
      clientStatus ? eq(agencyClients.status, clientStatus) : undefined,
      search
        ? or(
            ilike(clientTasks.title, `%${search}%`),
            ilike(agencyClients.companyName, `%${search}%`),
            ilike(agencyClients.contactName, `%${search}%`),
            ilike(clientTasks.assigneeName, `%${search}%`)
          )
        : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;

    // Enum column order is declaration order (low, medium, high), which is
    // backwards for "most urgent first" — and status has no natural order at
    // all. Both sort through an explicit ranking instead.
    const orderBy = {
      default: [desc(agencyClients.createdAt), asc(clientTasks.order)],
      due_soon: [sql`${clientTasks.dueDate} asc nulls last`],
      priority: [
        sql`case ${clientTasks.priority} when 'high' then 0 when 'medium' then 1 else 2 end`,
        asc(clientTasks.order),
      ],
      status: [
        sql`case ${clientTasks.status} when 'in_progress' then 0 when 'pending' then 1 else 2 end`,
        asc(clientTasks.order),
      ],
      client: [asc(agencyClients.companyName), asc(clientTasks.order)],
    }[sort];

    const [taskRows, [totals], clients, staff] = await Promise.all([
      db
        .select({
          id: clientTasks.id,
          clientId: clientTasks.clientId,
          title: clientTasks.title,
          department: clientTasks.department,
          stage: clientTasks.stage,
          status: clientTasks.status,
          priority: clientTasks.priority,
          assigneeId: clientTasks.assigneeId,
          assigneeName: clientTasks.assigneeName,
          order: clientTasks.order,
          dueDate: clientTasks.dueDate,
          companyName: agencyClients.companyName,
          contactName: agencyClients.contactName,
          clientStatus: agencyClients.status,
        })
        .from(clientTasks)
        .leftJoin(agencyClients, eq(clientTasks.clientId, agencyClients.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset(page * pageSize),
      // Total and completed count for the whole filtered set, not the page —
      // the header counts describe the selection, not what's on screen.
      db
        .select({
          total: count(),
          done: sql<number>`count(*) filter (where ${clientTasks.status} = 'completed')::int`,
        })
        .from(clientTasks)
        .leftJoin(agencyClients, eq(clientTasks.clientId, agencyClients.id))
        .where(where),
      db
        .select({
          id: agencyClients.id,
          companyName: agencyClients.companyName,
          contactName: agencyClients.contactName,
          status: agencyClients.status,
        })
        .from(agencyClients)
        .orderBy(asc(agencyClients.companyName)),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.role, ["admin", "project_manager", "va"]))
        .orderBy(asc(users.createdAt)),
    ]);

    return NextResponse.json({
      tasks: taskRows,
      total: totals?.total ?? 0,
      done: totals?.done ?? 0,
      page,
      pageSize,
      clients,
      staff: staff.map((s) => ({
        id: s.id,
        name: s.firstName || s.email.split("@")[0],
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client tasks feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
