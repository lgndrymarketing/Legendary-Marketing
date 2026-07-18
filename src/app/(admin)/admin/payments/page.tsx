"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, StatHeader } from "@/components/ui/firecrawl";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CreditCard, Plus, Pencil } from "lucide-react";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  notes: string | null;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientEmail: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface PaymentsResponse {
  payments: PaymentRow[];
  summary: { total: number; paid: number; pending: number };
}

// Amounts are stored in cents — format as whole dollars ("$X,XXX"), matching
// the Overview page.
function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

const STATUSES = ["completed", "pending", "failed", "refunded"] as const;

// Same semantics as the old badge variants, rendered as uppercase mono text.
const statusClass = (status: string): string =>
  status === "completed"
    ? "text-success"
    : status === "pending"
    ? "text-warning"
    : status === "failed" || status === "refunded"
    ? "text-destructive"
    : "text-muted-foreground";

const sourceBadge = (source: string) =>
  source === "ghl" ? "GoHighLevel" : source === "portal" ? "Manual" : "Portal";

const selectClass =
  "h-9 rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    amount: "",
    status: "completed",
    notes: "",
  });

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/admin/payments").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/projects").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([data, projectRows]: [PaymentsResponse | null, ProjectOption[]]) => {
        if (data && Array.isArray(data.payments)) {
          setPayments(data.payments);
          if (data.summary) setSummary(data.summary);
        }
        if (Array.isArray(projectRows)) setProjects(projectRows);
      })
      .catch(() => {
        /* leave empty state in place */
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const clientName = (p: PaymentRow) => {
    const name = [p.clientFirstName, p.clientLastName].filter(Boolean).join(" ");
    return name || p.clientEmail || "—";
  };

  function openAdd() {
    setEditingId(null);
    setForm({ projectId: "", amount: "", status: "completed", notes: "" });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: PaymentRow) {
    setEditingId(p.id);
    setForm({
      projectId: p.projectId ?? "",
      amount: String(p.amount / 100),
      status: p.status,
      notes: p.notes ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (!editingId && !form.projectId) {
      setError("Pick a project.");
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/admin/payments/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: cents,
              status: form.status,
              notes: form.notes.trim() || null,
            }),
          })
        : await fetch("/api/admin/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: form.projectId,
              amount: cents,
              status: form.status,
              notes: form.notes.trim() || undefined,
            }),
          });
      if (!res.ok) throw new Error();
      setFormOpen(false);
      setEditingId(null);
      load();
    } catch {
      setError("Could not save the payment — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHero
        title="Payments"
        description="Track all payments and revenue."
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Payment
          </Button>
        }
      />

      {/* Revenue summary — hairline-divided 3-up */}
      <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatHeader
          className="px-5 py-6"
          title="Total Revenue"
          caption="ALL SOURCES"
          value={summary.total}
          format={formatCents}
        />
        <StatHeader
          className="px-5 py-6"
          title="Paid"
          caption="COMPLETED"
          value={summary.paid}
          format={formatCents}
        />
        <StatHeader
          className="px-5 py-6"
          title="Pending"
          caption="AWAITING PAYMENT"
          value={summary.pending}
          format={formatCents}
        />
      </div>

      {/* Add / edit form */}
      {formOpen && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="rounded-xl border border-border p-5"
        >
          <p className="micro-label pb-4">
            {editingId ? "Edit payment" : "Record payment"}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_1fr_auto]">
            {editingId ? (
              <Input
                disabled
                value={
                  payments.find((p) => p.id === editingId)?.projectName ?? "—"
                }
              />
            ) : (
              <select
                className={selectClass}
                value={form.projectId}
                onChange={(e) =>
                  setForm({ ...form, projectId: e.target.value })
                }
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <Input
              className="sm:w-32"
              placeholder="Amount ($)"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <Input
              placeholder="Notes (e.g. wire ref, 50% deposit)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </motion.form>
      )}

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <CreditCard className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Payment History</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={6} />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            description="Record payments manually with Add Payment, or let them sync in from GoHighLevel."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Client</th>
                  <th className="micro-label py-3 pr-4">Project</th>
                  <th className="micro-label py-3 pr-4">Amount</th>
                  <th className="micro-label py-3 pr-4">Status</th>
                  <th className="micro-label py-3 pr-4">Source</th>
                  <th className="micro-label py-3 pr-4">Notes</th>
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
                {payments.map((payment) => (
                  <motion.tr
                    key={payment.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium">{clientName(payment)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {payment.projectName ?? "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {formatCents(payment.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
                          statusClass(payment.status)
                        )}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={payment.source === "ghl" ? "orange" : "secondary"}
                      >
                        {sourceBadge(payment.source)}
                      </Badge>
                    </td>
                    <td
                      className="max-w-48 truncate py-3 pr-4 text-muted-foreground"
                      title={payment.notes ?? undefined}
                    >
                      {payment.notes ?? "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(payment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openEdit(payment)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 cursor-pointer"
                        aria-label="Edit payment"
                      >
                        <Pencil className="h-4 w-4" />
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
