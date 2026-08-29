import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import {
  agencyClients,
  clientPayments,
  clientRequests,
  clientTasks,
  expenses,
  mcpKeys,
  users,
  weeklyReports,
} from "@/db/schema";
import { and, asc, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { STAGE_LABELS, type CrmStage } from "@/lib/crm";

/**
 * The LGNDRY MCP server — read-only agency data for AI assistants.
 *
 * Security model, in order of the layers a request passes through:
 *   1. The key. 32 random bytes, shown once at creation; only its SHA-256
 *      lives in the database, so a database read cannot recover a usable key.
 *   2. The key's owner. Every request re-checks that the admin who created
 *      the key still has role = 'admin'. Demote or delete the admin and all
 *      of their keys stop working on the next request.
 *   3. Revocation. Keys are revocable from Integrations; revoked keys keep
 *      their row (audit trail) but fail auth.
 *   4. Read-only. Every tool is a SELECT. There is deliberately no tool that
 *      writes, so a leaked key — or a prompt-injected assistant — can exfil
 *      at worst, never mutate money, clients, or tasks.
 *   5. Rate limit. Enforced per key in the route handler.
 *
 * The transport lives in app/api/mcp/[key]/route.ts.
 */

/* ------------------------------------------------------------------ keys -- */

const KEY_PREFIX = "lgndry_mcp_";

export function generateMcpKey(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = KEY_PREFIX + randomBytes(32).toString("base64url");
  return {
    plaintext,
    hash: createHash("sha256").update(plaintext).digest("hex"),
    prefix: plaintext.slice(0, 15),
  };
}

export interface McpAuth {
  keyId: string;
  adminName: string;
}

/** Resolve a presented key to its record, or null. Hash-lookup means no
 * plaintext comparison anywhere, and an unknown key costs one indexed read. */
export async function authenticateMcpKey(presented: string): Promise<McpAuth | null> {
  if (!presented.startsWith(KEY_PREFIX) || presented.length > 128) return null;
  const hash = createHash("sha256").update(presented).digest("hex");
  const [row] = await db
    .select({
      keyId: mcpKeys.id,
      revokedAt: mcpKeys.revokedAt,
      role: users.role,
      firstName: users.firstName,
      email: users.email,
    })
    .from(mcpKeys)
    .innerJoin(users, eq(mcpKeys.createdBy, users.id))
    .where(eq(mcpKeys.keyHash, hash));
  if (!row || row.revokedAt || row.role !== "admin") return null;

  // Usage trail — best-effort, never blocks the request.
  db.update(mcpKeys)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${mcpKeys.requestCount} + 1`,
    })
    .where(eq(mcpKeys.id, row.keyId))
    .catch(() => {});

  return { keyId: row.keyId, adminName: row.firstName || row.email };
}

/* ----------------------------------------------------------------- tools -- */

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const day = (d: Date | string | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

/** Strict yyyy-mm-dd → Date, or null. */
function parseDay(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const clampLimit = (v: unknown, fallback: number, max: number) => {
  const n = typeof v === "number" ? Math.floor(v) : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export const MCP_TOOLS: ToolDef[] = [
  {
    name: "agency_overview",
    description:
      "Snapshot of the agency right now: active clients, MRR/ARR, monthly recurring costs, overdue clients, weekly reports awaiting clients, and open client requests. Start here for any 'how are we doing' question.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const [[roster], [burn], [pendingReports], [openRequests]] =
        await Promise.all([
          db
            .select({
              active: sql<number>`count(*) filter (where ${agencyClients.status} = 'active')::int`,
              paused: sql<number>`count(*) filter (where ${agencyClients.status} = 'paused')::int`,
              churned: sql<number>`count(*) filter (where ${agencyClients.status} = 'churned')::int`,
              mrr: sql<number>`coalesce(sum(${agencyClients.monthlyFee}) filter (where ${agencyClients.status} = 'active'), 0)::int`,
              overdue: sql<number>`count(*) filter (where ${agencyClients.status} = 'active' and ${agencyClients.nextDueDate} < now())::int`,
            })
            .from(agencyClients),
          db
            .select({
              monthly: sql<number>`coalesce(sum(${expenses.amount}) filter (where ${expenses.cadence} = 'monthly'), 0)::int`,
            })
            .from(expenses),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(weeklyReports)
            .where(eq(weeklyReports.status, "pending_client")),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(clientRequests)
            .where(eq(clientRequests.status, "open")),
        ]);
      return {
        clients: {
          active: roster.active,
          paused: roster.paused,
          churned: roster.churned,
          overdue: roster.overdue,
        },
        mrr: usd(roster.mrr),
        arr: usd(roster.mrr * 12),
        monthlyRecurringCosts: usd(burn.monthly),
        weeklyReportsAwaitingClient: pendingReports.n,
        openClientRequests: openRequests.n,
      };
    },
  },
  {
    name: "list_clients",
    description:
      "List roster clients with package, fees, pipeline stage and next due date. Filter by status (active/paused/churned) or search by client or company name.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "paused", "churned"] },
        search: { type: "string", description: "Match against contact or company name" },
        limit: { type: "number", description: "Max rows, default 25, cap 100" },
      },
    },
    handler: async (args) => {
      const filters = [
        args.status
          ? eq(agencyClients.status, args.status as "active")
          : undefined,
        typeof args.search === "string" && args.search.trim()
          ? or(
              ilike(agencyClients.contactName, `%${args.search.trim()}%`),
              ilike(agencyClients.companyName, `%${args.search.trim()}%`)
            )
          : undefined,
      ].filter(Boolean);
      const rows = await db
        .select()
        .from(agencyClients)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(asc(agencyClients.companyName))
        .limit(clampLimit(args.limit, 25, 100));
      return rows.map((c) => ({
        client: c.contactName,
        company: c.companyName,
        status: c.status,
        package: c.package === "custom" ? c.packageLabel ?? "custom" : c.package,
        monthlyFee: usd(c.monthlyFee),
        setupFee: usd(c.setupFee),
        stage: STAGE_LABELS[c.stage as CrmStage] ?? c.stage,
        started: day(c.startDate),
        nextDue: day(c.nextDueDate),
        ghlAccount: c.ghlAccountName,
      }));
    },
  },
  {
    name: "get_client",
    description:
      "Everything about one client: record, onboarding checklist progress, recent payments, weekly report totals and open requests. Look up by client name or company name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Client or company name (partial ok)" },
      },
      required: ["name"],
    },
    handler: async (args) => {
      const q = String(args.name ?? "").trim();
      if (!q) return { error: "Give a client or company name." };
      const matches = await db
        .select()
        .from(agencyClients)
        .where(
          or(
            ilike(agencyClients.contactName, `%${q}%`),
            ilike(agencyClients.companyName, `%${q}%`)
          )
        )
        .limit(5);
      if (!matches.length) return { error: `No client matches "${q}".` };
      if (matches.length > 1) {
        return {
          ambiguous: matches.map((m) => `${m.contactName} (${m.companyName})`),
        };
      }
      const c = matches[0];
      const [tasks, payments, reports, requests] = await Promise.all([
        db
          .select({
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${clientTasks.status} = 'completed')::int`,
          })
          .from(clientTasks)
          .where(eq(clientTasks.clientId, c.id)),
        db
          .select()
          .from(clientPayments)
          .where(eq(clientPayments.clientId, c.id))
          .orderBy(desc(clientPayments.paidAt))
          .limit(10),
        db
          .select({
            weeks: sql<number>`count(*)::int`,
            leads: sql<number>`coalesce(sum(${weeklyReports.leads}), 0)::int`,
            spend: sql<number>`coalesce(sum(${weeklyReports.totalSpend}), 0)::int`,
            revenue: sql<number>`coalesce(sum(${weeklyReports.revenue}), 0)::int`,
            pending: sql<number>`count(*) filter (where ${weeklyReports.status} = 'pending_client')::int`,
          })
          .from(weeklyReports)
          .where(eq(weeklyReports.clientId, c.id)),
        db
          .select({
            subject: clientRequests.subject,
            status: clientRequests.status,
            createdAt: clientRequests.createdAt,
          })
          .from(clientRequests)
          .where(eq(clientRequests.clientId, c.id))
          .orderBy(desc(clientRequests.createdAt))
          .limit(5),
      ]);
      const t = tasks[0];
      const r = reports[0];
      return {
        client: c.contactName,
        company: c.companyName,
        status: c.status,
        package: c.package === "custom" ? c.packageLabel ?? "custom" : c.package,
        monthlyFee: usd(c.monthlyFee),
        setupFee: usd(c.setupFee),
        stage: STAGE_LABELS[c.stage as CrmStage] ?? c.stage,
        started: day(c.startDate),
        nextDue: day(c.nextDueDate),
        churned: day(c.churnedAt),
        ghlAccount: c.ghlAccountName,
        notes: c.notes,
        onboarding: `${t.done}/${t.total} checklist steps done`,
        adPerformance: {
          weeksReported: r.weeks,
          totalLeads: r.leads,
          adSpend: usd(r.spend),
          clientRevenue: usd(r.revenue),
          roas: r.spend > 0 ? +(r.revenue / r.spend).toFixed(2) : null,
          weeksAwaitingClient: r.pending,
        },
        recentPayments: payments.map((p) => ({
          date: day(p.paidAt),
          amount: usd(p.amount),
          type: p.paymentType,
          method: p.method,
        })),
        openRequests: requests,
      };
    },
  },
  {
    name: "financial_summary",
    description:
      "Financial totals, optionally windowed with from/to (yyyy-mm-dd, inclusive): collected revenue, expenses, profit, plus churn for the window. Without dates it is all-time.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "yyyy-mm-dd" },
        to: { type: "string", description: "yyyy-mm-dd, inclusive" },
      },
    },
    handler: async (args) => {
      const from = parseDay(args.from);
      const toIn = parseDay(args.to);
      const toEx = toIn ? new Date(toIn.getTime() + 86_400_000) : null;
      const windowed = !!(from || toEx);

      const payFilters = [
        from ? sql`${clientPayments.paidAt} >= ${from}` : undefined,
        toEx ? lt(clientPayments.paidAt, toEx) : undefined,
      ].filter(Boolean);
      const [[pay], expenseRows, [churn]] = await Promise.all([
        db
          .select({
            collected: sql<number>`coalesce(sum(${clientPayments.amount}), 0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(clientPayments)
          .where(payFilters.length ? and(...payFilters) : undefined),
        db.select().from(expenses),
        db
          .select({
            lost: windowed
              ? sql<number>`count(*) filter (where ${agencyClients.churnedAt} >= ${from ?? new Date(0)} and ${agencyClients.churnedAt} < ${toEx ?? new Date("2100-01-01")})::int`
              : sql<number>`count(*) filter (where ${agencyClients.status} = 'churned')::int`,
            total: sql<number>`count(*)::int`,
          })
          .from(agencyClients),
      ]);

      // Expenses mirror the Financials page: one-time land on their date;
      // monthly recur each month they were live inside the window.
      const now = new Date();
      const start = from ?? null;
      const end = toEx ?? now;
      let totalCosts = 0;
      for (const e of expenseRows) {
        const incurred = new Date(e.incurredAt);
        if (e.cadence === "one_time") {
          if (start && incurred < start) continue;
          if (incurred >= end) continue;
          totalCosts += e.amount;
        } else {
          const liveFrom = start && start > incurred ? start : incurred;
          if (liveFrom >= end) continue;
          const months =
            (end.getUTCFullYear() - liveFrom.getUTCFullYear()) * 12 +
            (end.getUTCMonth() - liveFrom.getUTCMonth()) +
            1;
          totalCosts += e.amount * Math.max(months, 1);
        }
      }

      return {
        window: windowed
          ? `${day(from ?? new Date(0))} → ${day(toIn ?? now)}`
          : "all time",
        collectedRevenue: usd(pay.collected),
        paymentsRecorded: pay.count,
        expenses: usd(totalCosts),
        profit: usd(pay.collected - totalCosts),
        clientsLost: churn.lost,
        note: "Revenue is collected client payments (setup fees + retainers). The Financials page is the source of record; use it for anything money-critical.",
      };
    },
  },
  {
    name: "list_tasks",
    description:
      "Open onboarding/custom tasks across clients, with assignee and due date. Filter by status (pending/in_progress/completed), department (csm/ads/funnel/automations), or client name.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "completed"] },
        department: { type: "string", enum: ["csm", "ads", "funnel", "automations"] },
        client: { type: "string", description: "Client or company name filter" },
        limit: { type: "number", description: "Max rows, default 25, cap 100" },
      },
    },
    handler: async (args) => {
      const filters = [
        args.status
          ? eq(clientTasks.status, args.status as "pending")
          : undefined,
        args.department
          ? eq(clientTasks.department, args.department as "csm")
          : undefined,
        typeof args.client === "string" && args.client.trim()
          ? or(
              ilike(agencyClients.contactName, `%${args.client.trim()}%`),
              ilike(agencyClients.companyName, `%${args.client.trim()}%`)
            )
          : undefined,
      ].filter(Boolean);
      const rows = await db
        .select({
          title: clientTasks.title,
          status: clientTasks.status,
          priority: clientTasks.priority,
          department: clientTasks.department,
          assignee: clientTasks.assigneeName,
          dueDate: clientTasks.dueDate,
          client: agencyClients.contactName,
          company: agencyClients.companyName,
        })
        .from(clientTasks)
        .leftJoin(agencyClients, eq(clientTasks.clientId, agencyClients.id))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(sql`${clientTasks.dueDate} asc nulls last`)
        .limit(clampLimit(args.limit, 25, 100));
      return rows.map((r) => ({ ...r, dueDate: day(r.dueDate) }));
    },
  },
  {
    name: "overdue_clients",
    description:
      "Active clients whose next payment due date has passed — who to chase, sorted most overdue first.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = await db
        .select()
        .from(agencyClients)
        .where(
          and(
            eq(agencyClients.status, "active"),
            lt(agencyClients.nextDueDate, new Date())
          )
        )
        .orderBy(asc(agencyClients.nextDueDate))
        .limit(50);
      return rows.map((c) => ({
        client: c.contactName,
        company: c.companyName,
        monthlyFee: usd(c.monthlyFee),
        dueDate: day(c.nextDueDate),
        daysOverdue: Math.floor(
          (Date.now() - new Date(c.nextDueDate!).getTime()) / 86_400_000
        ),
      }));
    },
  },
  {
    name: "list_payments",
    description:
      "Recent recorded client payments, newest first. Optionally filter by client or company name.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Client or company name filter" },
        limit: { type: "number", description: "Max rows, default 25, cap 100" },
      },
    },
    handler: async (args) => {
      const nameFilter =
        typeof args.client === "string" && args.client.trim()
          ? or(
              ilike(agencyClients.contactName, `%${args.client.trim()}%`),
              ilike(agencyClients.companyName, `%${args.client.trim()}%`)
            )
          : undefined;
      const rows = await db
        .select({
          date: clientPayments.paidAt,
          amount: clientPayments.amount,
          type: clientPayments.paymentType,
          method: clientPayments.method,
          client: agencyClients.contactName,
          company: agencyClients.companyName,
          notes: clientPayments.notes,
        })
        .from(clientPayments)
        .leftJoin(agencyClients, eq(clientPayments.clientId, agencyClients.id))
        .where(nameFilter)
        .orderBy(desc(clientPayments.paidAt))
        .limit(clampLimit(args.limit, 25, 100));
      return rows.map((r) => ({
        ...r,
        date: day(r.date),
        amount: usd(r.amount),
      }));
    },
  },
  {
    name: "weekly_reports_status",
    description:
      "The weekly reporting loop: weeks the agency has posted that still await the client's closes/revenue, plus the most recent completed weeks.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const [pending, completed] = await Promise.all([
        db
          .select({
            client: agencyClients.contactName,
            company: agencyClients.companyName,
            weekEnd: weeklyReports.weekEnd,
            leads: weeklyReports.leads,
            spend: weeklyReports.totalSpend,
          })
          .from(weeklyReports)
          .leftJoin(agencyClients, eq(weeklyReports.clientId, agencyClients.id))
          .where(eq(weeklyReports.status, "pending_client"))
          .orderBy(asc(weeklyReports.weekEnd))
          .limit(50),
        db
          .select({
            client: agencyClients.contactName,
            company: agencyClients.companyName,
            weekEnd: weeklyReports.weekEnd,
            leads: weeklyReports.leads,
            spend: weeklyReports.totalSpend,
            revenue: weeklyReports.revenue,
          })
          .from(weeklyReports)
          .leftJoin(agencyClients, eq(weeklyReports.clientId, agencyClients.id))
          .where(eq(weeklyReports.status, "completed"))
          .orderBy(desc(weeklyReports.weekEnd))
          .limit(15),
      ]);
      return {
        awaitingClient: pending.map((r) => ({
          ...r,
          weekEnd: day(r.weekEnd),
          spend: usd(r.spend),
        })),
        recentCompleted: completed.map((r) => ({
          ...r,
          weekEnd: day(r.weekEnd),
          spend: usd(r.spend),
          revenue: r.revenue !== null ? usd(r.revenue) : null,
          roas:
            r.revenue !== null && r.spend > 0
              ? +(r.revenue / r.spend).toFixed(2)
              : null,
        })),
      };
    },
  },
  {
    name: "open_requests",
    description:
      "Requests & feedback clients have raised from their portal that are not yet resolved.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = await db
        .select({
          client: agencyClients.contactName,
          company: agencyClients.companyName,
          subject: clientRequests.subject,
          details: clientRequests.details,
          status: clientRequests.status,
          createdAt: clientRequests.createdAt,
        })
        .from(clientRequests)
        .leftJoin(agencyClients, eq(clientRequests.clientId, agencyClients.id))
        .where(
          or(
            eq(clientRequests.status, "open"),
            eq(clientRequests.status, "in_progress")
          )
        )
        .orderBy(desc(clientRequests.createdAt))
        .limit(50);
      return rows.map((r) => ({ ...r, createdAt: day(r.createdAt) }));
    },
  },
];
