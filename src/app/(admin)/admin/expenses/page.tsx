"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, StatHeader } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Receipt, Plus, Trash2 } from "lucide-react";

interface ExpenseRow {
  id: string;
  name: string;
  category: string;
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
  { value: "other", label: "Other" },
] as const;

const categoryLabel = (v: string) =>
  CATEGORIES.find((c) => c.value === v)?.label ?? v;

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "saas",
    amount: "",
    cadence: "monthly",
  });

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
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          amount: cents,
          cadence: form.cadence,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ name: "", category: form.category, amount: "", cadence: form.cadence });
      setFormOpen(false);
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

  return (
    <div className="space-y-10">
      <PageHero
        title="Expenses"
        description="SaaS, team, fees, and ad spend — the cost side of the P&L."
        action={
          <Button size="sm" onClick={() => setFormOpen((o) => !o)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Expense
          </Button>
        }
      />

      {/* Summary — hairline-divided 3-up */}
      <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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

      {/* Inline add form */}
      {formOpen && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="rounded-xl border border-border p-5"
        >
          <p className="micro-label pb-4">New expense</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <Input
              placeholder="Name (e.g. GoHighLevel subscription)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className={selectClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              className="sm:w-32"
              placeholder="Amount ($)"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <select
              className={selectClass}
              value={form.cadence}
              onChange={(e) => setForm({ ...form, cadence: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </motion.form>
      )}

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Receipt className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Expense Log</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={5} />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses recorded"
            description="Track SaaS subscriptions, contractor pay, platform fees, and ad spend to see true profit on the Financials page."
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
                {expenses.map((expense) => (
                  <motion.tr
                    key={expense.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium">{expense.name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">
                        {categoryLabel(expense.category)}
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
                    <td className="py-3 text-right">
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
