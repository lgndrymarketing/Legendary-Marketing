"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero, SegmentedTabs, BracketLabel } from "@/components/ui/firecrawl";
import { SearchPill, SelectPill, SortPill } from "@/components/ui/filters";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientDetailModal } from "@/components/admin/crm-client-detail-modal";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import {
  DEPARTMENT_LABELS,
  PRIORITY_LABELS,
  type Department,
  type TaskPriority,
} from "@/lib/crm";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Maximize2,
  Plus,
  User,
  Users,
  X,
} from "lucide-react";
import { FocusBeam } from "@/components/ui/beam-focus";

interface TaskRow {
  id: string;
  clientId: string;
  title: string;
  department: Department | null;
  status: "pending" | "in_progress" | "completed";
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  companyName: string | null;
  contactName: string | null;
  clientStatus: string | null;
}

interface Feed {
  tasks: TaskRow[];
  /** Totals for the whole filtered set, not just this page. */
  total: number;
  done: number;
  clients: { id: string; companyName: string; contactName: string; status: string }[];
  staff: { id: string; name: string }[];
}

// Screenshot order: All Departments · CSM · Ads · Funnel · Automations.
const DEPT_TABS = ["All Departments", "CSM", "Ads", "Funnel", "Automations"];
const DEPT_BY_TAB: Record<string, Department> = {
  CSM: "csm",
  Ads: "ads",
  Funnel: "funnel",
  Automations: "automations",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const statusTone: Record<string, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  in_progress: "border-orange/30 bg-accent text-orange",
  completed: "border-success/30 bg-success/10 text-success",
};

const priorityTone: Record<TaskPriority, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

/** The roster carries thousands of checklist tasks — render one page at a
 * time. Everything above ~50 rows makes the table (three form controls per
 * row) janky and stretches the row cascade into a visible crawl. */
const PAGE_SIZE = 25;

export default function AdminTasksPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All Departments");
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("active");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(0);
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Everything below is resolved by Postgres — the roster carries thousands
  // of checklist tasks, and pulling them all into the browser to filter here
  // is what froze the page on open.
  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    if (DEPT_BY_TAB[tab]) p.set("dept", DEPT_BY_TAB[tab]);
    if (assigneeFilter !== "all") p.set("assignee", assigneeFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (priorityFilter !== "all") p.set("priority", priorityFilter);
    if (clientFilter !== "all") p.set("clientStatus", clientFilter);
    if (debouncedQuery.trim()) p.set("q", debouncedQuery.trim());
    p.set("sort", sort);
    return p.toString();
  }, [
    page,
    tab,
    assigneeFilter,
    statusFilter,
    priorityFilter,
    clientFilter,
    debouncedQuery,
    sort,
  ]);

  const load = useCallback(() => {
    fetch(`/api/admin/client-tasks?${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Feed | null) => {
        if (data && Array.isArray(data.tasks)) setFeed(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(load, [load]);
  useCrmRealtime(load);

  async function patchTask(id: string, patch: Record<string, unknown>) {
    // Optimistic update, with a rollback if the save is rejected. No blanket
    // reload: refetching the whole feed on every dropdown change is what made
    // the table flash between renders.
    const before = feed?.tasks.find((t) => t.id === id);
    setFeed((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === id ? { ...t, ...patch } : t
            ),
          }
        : prev
    );
    try {
      const res = await fetch(`/api/admin/client-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (before) {
        setFeed((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === id ? before : t)),
              }
            : prev
        );
      }
    }
  }

  // Debounce the search box: each keystroke is a query now.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change starts a new result set — go back to the first page.
  useEffect(() => {
    setPage(0);
  }, [
    tab,
    debouncedQuery,
    clientFilter,
    assigneeFilter,
    statusFilter,
    priorityFilter,
    sort,
  ]);

  const tasks = feed?.tasks ?? [];
  const total = feed?.total ?? 0;
  const doneCount = feed?.done ?? 0;
  const filtersActive =
    tab !== "All Departments" ||
    search.trim() !== "" ||
    clientFilter !== "active" ||
    assigneeFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  return (
    <div className="space-y-8">
      <PageHero
        title="Task Manager"
        description="Manage team tasks across all clients."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Custom Task
          </Button>
        }
      />

      {/* Department tabs + filter row */}
      <div className="space-y-4">
        <SegmentedTabs options={DEPT_TABS} value={tab} onChange={setTab} />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchPill
            className="sm:w-64"
            value={search}
            onChange={setSearch}
            placeholder="Search tasks, clients or assignees…"
          />
          <SelectPill
            className="sm:w-44"
            icon={User}
            ariaLabel="Assignee"
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={[
              { value: "all", label: "All Assignees" },
              ...(feed?.staff ?? []).map((s) => ({
                value: s.id,
                label: s.name,
              })),
            ]}
          />
          <SelectPill
            className="sm:w-40"
            icon={Filter}
            ariaLabel="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "all", label: "All Statuses" }, ...STATUS_OPTIONS]}
          />
          <SelectPill
            className="sm:w-40"
            icon={Filter}
            ariaLabel="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "all", label: "All Priorities" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <SelectPill
            className="sm:w-44"
            icon={Users}
            ariaLabel="Client status"
            value={clientFilter}
            onChange={setClientFilter}
            options={[
              { value: "active", label: "Active clients" },
              { value: "paused", label: "Paused clients" },
              { value: "churned", label: "Churned clients" },
              { value: "all", label: "All clients" },
            ]}
          />
          <SortPill
            className="sm:w-52"
            value={sort}
            onChange={setSort}
            options={[
              { value: "default", label: "Checklist order" },
              { value: "due_soon", label: "Due date: soonest first" },
              { value: "priority", label: "Priority: high → low" },
              { value: "status", label: "Status: in progress first" },
              { value: "client", label: "Client A–Z" },
            ]}
          />
        </div>
      </div>

      {/* Task table */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <BracketLabel n={total} label="TASKS" />
          <BracketLabel n={doneCount} m={total} label="COMPLETED" />
        </div>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filtersActive ? "No matching tasks" : "No tasks yet"}
            description={
              filtersActive
                ? "No tasks match the current filters. This view shows active clients by default — switch to All clients to include paused and churned ones."
                : "Create a client from the Clients page to seed its onboarding checklist, or add a custom task."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Task</th>
                  <th className="micro-label py-3 pr-4">Client</th>
                  <th className="micro-label py-3 pr-4">Assignee</th>
                  <th className="micro-label py-3 pr-4">Due Date</th>
                  <th className="micro-label py-3 pr-4">Priority</th>
                  <th className="micro-label py-3 pr-4">Status</th>
                  <th className="micro-label py-3 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                key={safePage}
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {tasks.map((t) => (
                  <motion.tr
                    key={t.id}
                    variants={rowItem}
                    className={cn(
                      "group transition-colors hover:bg-muted/50",
                      t.status === "completed" && "opacity-70"
                    )}
                  >
                    <td className="py-3 pr-4 font-medium">{t.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {t.contactName ?? t.companyName ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {t.assigneeName ? (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                          {t.assigneeName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="date"
                        aria-label={`Due date for ${t.title}`}
                        className="h-8 w-[9.5rem] rounded-lg border border-transparent bg-transparent px-2 font-mono text-xs text-muted-foreground outline-none transition-colors hover:border-border focus:border-orange"
                        value={t.dueDate ? t.dueDate.slice(0, 10) : ""}
                        onChange={(e) =>
                          patchTask(t.id, {
                            dueDate: e.target.value
                              ? new Date(
                                  e.target.value + "T00:00:00Z"
                                ).toISOString()
                              : null,
                          })
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        aria-label={`Priority for ${t.title}`}
                        className={cn(
                          // Fixed width: a native select that resizes with its
                          // label reflows every column to its right on change.
                          "h-8 w-[6.5rem] cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent px-2 font-mono text-[11px] font-semibold uppercase tracking-wide outline-none transition-colors hover:border-border focus:border-orange",
                          priorityTone[t.priority]
                        )}
                        value={t.priority}
                        onChange={(e) =>
                          patchTask(t.id, { priority: e.target.value })
                        }
                      >
                        {(["high", "medium", "low"] as const).map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        aria-label={`Status for ${t.title}`}
                        className={cn(
                          "h-8 w-[8.5rem] cursor-pointer appearance-none rounded-full border px-3 text-center font-mono text-[11px] font-semibold uppercase tracking-wide outline-none transition-colors focus:border-orange",
                          statusTone[t.status]
                        )}
                        value={t.status}
                        onChange={(e) =>
                          patchTask(t.id, { status: e.target.value })
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setOpenClientId(t.clientId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5 cursor-pointer"
                        aria-label={`Open ${t.companyName ?? "client"}`}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}

        {/* Pager — the roster carries thousands of checklist tasks. */}
        {!loading && pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {safePage * PAGE_SIZE + 1}–
              {Math.min((safePage + 1) * PAGE_SIZE, total)} of{" "}
              {total.toLocaleString("en-US")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="font-mono text-[11px] text-muted-foreground">
                {safePage + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Open → full client details (checklist, stage, assets) */}
      <ClientDetailModal
        clientId={openClientId}
        onClose={() => setOpenClientId(null)}
        onSaved={load}
      />

      <AddCustomTaskModal
        open={createOpen}
        clients={feed?.clients ?? []}
        staff={feed?.staff ?? []}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}

/** Add Task to Client — client, title, department, assignee (screenshot). */
function AddCustomTaskModal({
  open,
  clients,
  staff,
  onClose,
  onCreated,
}: {
  open: boolean;
  clients: { id: string; companyName: string }[];
  staff: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    clientId: "",
    title: "",
    department: "",
    assigneeId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.clientId || !form.title.trim()) {
      setError("Pick a client and enter a task title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${form.clientId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          department: form.department || null,
          assigneeId: form.assigneeId || null,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ clientId: "", title: "", department: "", assigneeId: "" });
      onCreated();
    } catch {
      setError("Could not create the task — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <FocusBeam className="relative w-full max-w-lg">
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            onSubmit={submit}
            className="w-full rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
          >
            <div className="flex items-start justify-between pb-6">
              <h2 className="text-xl font-bold tracking-tight">
                Add Task to Client
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">
                  Client
                </span>
                <select
                  className={selectClass}
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">
                  Task Title
                </span>
                <Input
                  placeholder="e.g. Build secondary funnel"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Department
                  </span>
                  <select
                    className={selectClass}
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                  >
                    <option value="">Select department</option>
                    {(
                      Object.entries(DEPARTMENT_LABELS) as [
                        Department,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Assignee
                  </span>
                  <select
                    className={selectClass}
                    value={form.assigneeId}
                    onChange={(e) =>
                      setForm({ ...form, assigneeId: e.target.value })
                    }
                  >
                    <option value="">Select assignee</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Creating…" : "Create Task"}
              </Button>
            </div>
          </motion.form>
          </FocusBeam>
        </div>
      )}
    </AnimatePresence>
  );
}
