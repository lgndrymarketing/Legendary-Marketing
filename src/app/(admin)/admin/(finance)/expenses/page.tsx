"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PageHero, StatHeader, BracketLabel } from "@/components/ui/firecrawl";
import {
  SearchPill,
  SelectPill,
  SortPill,
  DateRangePill,
  ALL_TIME,
  inRange,
  type DateRange,
} from "@/components/ui/filters";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendCard, type TrendPoint } from "@/components/ui/monthly-trend";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "motion/react";
import { Receipt, Plus, Trash2, Pencil, X, Filter } from "lucide-react";
import { FocusBeam } from "@/components/ui/beam-focus";

interface ExpenseRow {
  id: string;
  name: string;
  category: string;
  categoryLabel: string | null;
  amount: number;
  cadence: string;
  incurredAt: string;
  notes: string | null;
}

interface ExpensesResponse {
  expenses: ExpenseRow[];
  summary: { monthlyRecurring: number; oneTimeTotal: number; thisMonth: number };
}

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const CATEGORIES = [
  { value: "saas", label: "SaaS" },
  { value: "team", label: "Team" },
  { value: "fees", label: "Fees" },
  { value: "ads", label: "Ad Spend" },
] as const;

const categoryLabel = (row: { category: string; categoryLabel?: string | null }) =>
  row.category === "other" && row.categoryLabel
    ? row.categoryLabel
    : CATEGORIES.find((c) => c.value === row.category)?.label ?? row.category;

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [summary, setSummary] = useState({
    monthlyRecurring: 0,
    oneTimeTotal: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "saas",
    categoryCustom: "",
    amount: "",
    cadence: "monthly",
    incurredAt: "",
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cadenceFilter, setCadenceFilter] = useState("all");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [sort, setSort] = useState("date_desc");

  const today = () => new Date().toISOString().slice(0, 10);

  function openAdd() {
    setEditingId(null);
    setForm({
      name: "",
      category: "saas",
      categoryCustom: "",
      amount: "",
      cadence: "monthly",
      incurredAt: today(),
    });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(expense: ExpenseRow) {
    setEditingId(expense.id);
    setForm({
      name: expense.name,
      category: expense.category,
      categoryCustom:
        expense.category === "other" ? expense.categoryLabel ?? "" : "",
      amount: String(expense.amount / 100),
      cadence: expense.cadence,
      incurredAt: expense.incurredAt.slice(0, 10),
    });
    setError(null);
    setFormOpen(true);
  }

  const load = useCallback(() => {
    fetch("/api/admin/expenses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ExpensesResponse | null) => {
        if (data && Array.isArray(data.expenses)) {
          setExpenses(data.expenses);
          setSummary(data.summary);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (!form.name.trim() || !Number.isFinite(cents) || cents <= 0) {
      setError("Enter a name and a positive amount.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        categoryLabel:
          form.category === "other" ? form.categoryCustom.trim() || null : null,
        amount: cents,
        cadence: form.cadence,
        incurredAt: form.incurredAt
          ? new Date(form.incurredAt + "T00:00:00Z").toISOString()
          : undefined,
      };
      const res = editingId
        ? await fetch(`/api/admin/expenses/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();
      setFormOpen(false);
      setEditingId(null);
      load();
    } catch {
      setError("Could not save the expense — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setExpenses((rows) => rows.filter((r) => r.id !== id));
    await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    // Refresh either way so totals stay truthful.
    load();
  }

  // Filters + sort apply to the trend charts and the expense log; the
  // summary tiles stay global (they are labeled every-month / all-time).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = expenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter)
        return false;
      if (cadenceFilter !== "all" && e.cadence !== cadenceFilter) return false;
      if (!inRange(e.incurredAt, range)) return false;
      if (q) {
        const hay = [e.name, categoryLabel(e), e.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = sort.endsWith("_asc") ? 1 : -1;
    rows.sort((a, b) =>
      sort.startsWith("amount")
        ? (a.amount - b.amount) * dir
        : (new Date(a.incurredAt).getTime() -
            new Date(b.incurredAt).getTime()) *
          dir
    );
    return rows;
  }, [expenses, search, categoryFilter, cadenceFilter, range, sort]);

  const filtersActive =
    search.trim() !== "" ||
    categoryFilter !== "all" ||
    cadenceFilter !== "all" ||
    range.preset !== "all";
  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  // Cost points for the trend charts — one-time expenses land in their
  // month; monthly expenses recur every month from incurredAt onward.
  const costPoints: TrendPoint[] = [];
  const oneTimePoints: TrendPoint[] = [];
  {
    const now = new Date();
    for (const e of filtered) {
      if (e.cadence === "monthly") {
        const start = new Date(e.incurredAt);
        const startMonth = new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)
        );
        for (let i = 5; i >= 0; i--) {
          const d = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
          );
          if (d >= startMonth)
            costPoints.push({ date: d.toISOString(), value: e.amount });
        }
      } else {
        costPoints.push({ date: e.incurredAt, value: e.amount });
        oneTimePoints.push({ date: e.incurredAt, value: e.amount });
      }
    }
  }

  return (
    <div className="space-y-10">
      <PageHero
        title="Expenses"
        description="SaaS, team, fees, and ad spend — the cost side of the P&L."
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Expense
          </Button>
        }
      />

      {/* Summary — hairline-divided 3-up */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatHeader
          className="px-5 py-6"
          title="Monthly Recurring"
          caption="EVERY MONTH"
          value={summary.monthlyRecurring}
          format={usd}
        />
        <StatHeader
          className="px-5 py-6"
          title="This Month"
          caption="RECURRING + ONE-TIME"
          value={summary.thisMonth}
          format={usd}
        />
        <StatHeader
          className="px-5 py-6"
          title="One-Time Total"
          caption="ALL TIME"
          value={summary.oneTimeTotal}
          format={usd}
        />
      </div>

      {/* Filter row — search + category/cadence pills, date range right-
          aligned. Drives the trends and the expense log below. */}
      {!loading && expenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchPill
              className="lg:w-64"
              placeholder="Search expenses…"
              value={search}
              onChange={setSearch}
            />
            <SelectPill
              className="lg:w-44"
              icon={Filter}
              ariaLabel="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "all", label: "All Categories" },
                ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
                { value: "other", label: "Custom" },
              ]}
            />
            <SelectPill
              className="lg:w-40"
              icon={Filter}
              ariaLabel="Cadence"
              value={cadenceFilter}
              onChange={setCadenceFilter}
              options={[
                { value: "all", label: "All Cadences" },
                { value: "monthly", label: "Monthly" },
                { value: "one_time", label: "One-time" },
              ]}
            />
            <SortPill
              className="lg:w-48"
              value={sort}
              onChange={setSort}
              options={[
                { value: "date_desc", label: "Newest first" },
                { value: "date_asc", label: "Oldest first" },
                { value: "amount_desc", label: "Amount: high → low" },
                { value: "amount_asc", label: "Amount: low → high" },
              ]}
            />
            <div className="lg:ml-auto">
              <DateRangePill value={range} onChange={setRange} />
            </div>
          </div>
          {filtersActive && (
            <BracketLabel
              n={filtered.length}
              m={expenses.length}
              label={`FILTERED · ${usd(filteredTotal)} IN EXPENSES`}
            />
          )}
        </div>
      )}

      {/* Trends — monthly cost burn + one-time spend */}
      {!loading && filtered.length > 0 && (
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <TrendCard
            title="Total Costs"
            caption="Recurring + one-time"
            points={costPoints}
            format={usd}
          />
          <TrendCard
            title="One-Time Spend"
            points={oneTimePoints}
            format={usd}
          />
        </section>
      )}

      {/* Add / edit modal */}
      <AnimatePresence>
      {formOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          onClick={() => setFormOpen(false)}
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
              {editingId ? "Edit Expense" : "Add Expense"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-[13px] font-medium">
                Description
              </span>
              <Input
                placeholder="e.g. GoHighLevel subscription"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium">
                Category
              </span>
              <select
                className={cn(selectClass, "w-full")}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
                <option value="other">Custom…</option>
              </select>
              {form.category === "other" && (
                <Input
                  className="mt-2"
                  placeholder="Custom category name"
                  value={form.categoryCustom}
                  onChange={(e) =>
                    setForm({ ...form, categoryCustom: e.target.value })
                  }
                />
              )}
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium">
                Amount ($)
              </span>
              <Input
                placeholder="Amount ($)"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium">
                Date
              </span>
              <Input
                type="date"
                value={form.incurredAt}
                onChange={(e) =>
                  setForm({ ...form, incurredAt: e.target.value })
                }
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium">
                Cadence
              </span>
              <select
                className={cn(selectClass, "w-full")}
                value={form.cadence}
                onChange={(e) => setForm({ ...form, cadence: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        </motion.form>
        </FocusBeam>
        </div>
      )}
      </AnimatePresence>

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Receipt className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Expense Log</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filtersActive ? "No matching expenses" : "No expenses recorded"}
            description={
              filtersActive
                ? "No expenses match the current filters — widen the date range or clear the search."
                : "Track SaaS subscriptions, contractor pay, platform fees, and ad spend to see true profit on the Financials page."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Name</th>
                  <th className="micro-label py-3 pr-4">Category</th>
                  <th className="micro-label py-3 pr-4">Amount</th>
                  <th className="micro-label py-3 pr-4">Cadence</th>
                  <th className="micro-label py-3 pr-4">Date</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {filtered.map((expense) => (
                  <motion.tr
                    key={expense.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium">{expense.name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">
                        {categoryLabel(expense)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {usd(expense.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold uppercase tracking-wide",
                          expense.cadence === "monthly"
                            ? "text-orange"
                            : "text-muted-foreground"
                        )}
                      >
                        {expense.cadence === "monthly" ? "Monthly" : "One-time"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(expense.incurredAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(expense)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 cursor-pointer"
                        aria-label={`Edit ${expense.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(expense.id)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 cursor-pointer"
                        aria-label={`Delete ${expense.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
