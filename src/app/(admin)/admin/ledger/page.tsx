"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rowCascade, rowItem, cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  HandCoins,
  CheckCircle2,
  Pencil,
  X,
  ArrowLeftRight,
  Calendar,
} from "lucide-react";

interface Partner {
  id: string;
  name: string;
  earned: number;
}

interface Transaction {
  id: string;
  companyName: string | null;
  paymentType: "setup_fee" | "monthly_retainer";
  method: string;
  amount: number;
  partnerCut: number;
  receivedBy: string | null;
  receivedByName: string;
  otherPartnerName: string;
  otherPartnerCut: number;
  splitStatus: "pending" | "settled";
  paidAt: string;
  notes: string | null;
}

interface LedgerResponse {
  partners: Partner[];
  netBalance: { from: string; to: string; amount: number } | null;
  transactions: Transaction[];
}

const PAYMENT_METHODS = [
  "Zelle",
  "Cash App",
  "PayPal",
  "Stripe",
  "Bank Transfer",
];

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

/** Start-of-range for the date filter, or null for "all". */
function rangeStart(range: string): Date | null {
  const now = new Date();
  if (range === "this_month")
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (range === "last_30")
    return new Date(now.getTime() - 30 * 86_400_000);
  if (range === "this_year")
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return null;
}

export default function AdminLedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    paymentType: "monthly_retainer",
    method: "Zelle",
    amount: "",
    receivedBy: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/ledger")
      .then((res) => (res.ok ? res.json() : null))
      .then((d: LedgerResponse | null) => {
        if (d && Array.isArray(d.transactions)) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function markSettled(t: Transaction) {
    await fetch(`/api/admin/client-payments/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitStatus: "settled" }),
    });
    load();
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setEditForm({
      paymentType: t.paymentType,
      method: t.method,
      amount: String(t.amount / 100),
      receivedBy: t.receivedBy ?? "",
    });
    setError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const cents = Math.round(parseFloat(editForm.amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/client-payments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: editForm.paymentType,
          method: editForm.method,
          amount: cents,
          ...(editForm.receivedBy && { receivedBy: editForm.receivedBy }),
        }),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      load();
    } catch {
      setError("Could not save — try again.");
    } finally {
      setSaving(false);
    }
  }

  const partners = data?.partners ?? [];
  const p1 = partners[0];
  const p2 = partners[1];
  const dateStart = rangeStart(dateFilter);
  const transactions = (data?.transactions ?? []).filter((t) => {
    const matchesStatus =
      statusFilter === "all" ? true : t.splitStatus === statusFilter;
    const matchesDate = !dateStart || new Date(t.paidAt) >= dateStart;
    return matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-8">
      <PageHero
        title="Partner Ledger"
        description={
          p1 && p2
            ? `Track payments between ${p1.name} and ${p2.name} automatically.`
            : "Partner splits, tracked automatically from recorded client payments."
        }
      />

      {/* Balance + earnings — hairline-divided 3-up */}
      <motion.section
        variants={cascade}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <motion.div variants={cascadeItem} className="px-5 py-6">
          <div className="flex items-center justify-between">
            <p className="micro-label">Net Balance</p>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {data?.netBalance ? (
            <>
              <p className="mt-2 text-2xl font-bold tracking-tight text-orange">
                {data.netBalance.from} owes {data.netBalance.to}{" "}
                {usd(data.netBalance.amount)}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Based on unsettled transactions
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                All settled up!
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Based on unsettled transactions
              </p>
            </>
          )}
        </motion.div>
        {partners.slice(0, 2).map((p) => (
          <motion.div key={p.id} variants={cascadeItem} className="px-5 py-6">
            <div className="flex items-center justify-between">
              <p className="micro-label">{p.name} Total Earned</p>
              <HandCoins className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {usd(p.earned)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Half of all net collections
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* Filters — date range (left) + transaction status (right) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-orange"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="this_month">This month</option>
            <option value="last_30">Last 30 days</option>
            <option value="this_year">This year</option>
          </select>
        </div>
        <select
          className="h-9 rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange sm:w-56"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Transactions</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      {/* History */}
      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <HandCoins className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Transaction History</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={5} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="No transactions yet"
            description="Record client payments from the Clients & Payments page — each one lands here with its partner split."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Date</th>
                  <th className="micro-label py-3 pr-4">Client</th>
                  <th className="micro-label py-3 pr-4">Total Paid</th>
                  <th className="micro-label py-3 pr-4">Received By</th>
                  <th className="micro-label py-3 pr-4">
                    {p1 ? `${p1.name}'s Cut` : "Partner Cut"}
                  </th>
                  <th className="micro-label py-3 pr-4">Status</th>
                  <th className="micro-label py-3 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {transactions.map((t) => (
                  <motion.tr
                    key={t.id}
                    variants={rowItem}
                    className={cn(
                      "group transition-colors hover:bg-muted/50",
                      t.splitStatus === "settled" && "opacity-70"
                    )}
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.paidAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {t.companyName ?? "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {usd(t.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold">
                        {t.receivedByName}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold text-success">
                      {usd(t.otherPartnerCut)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                          t.splitStatus === "pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {t.splitStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {t.splitStatus === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markSettled(t)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Mark Settled
                        </Button>
                      )}
                      <button
                        onClick={() => openEdit(t)}
                        className="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        aria-label="Edit payment"
                        title="Edit payment"
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

      {/* Edit payment modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditing(null)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submitEdit}
              className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <h2 className="text-xl font-bold tracking-tight">
                  Edit Payment
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Payment Type
                  </span>
                  <select
                    className={selectClass}
                    value={editForm.paymentType}
                    onChange={(e) =>
                      setEditForm({ ...editForm, paymentType: e.target.value })
                    }
                  >
                    <option value="setup_fee">Setup Fee</option>
                    <option value="monthly_retainer">Monthly Retainer</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Payment Method
                  </span>
                  <select
                    className={selectClass}
                    value={editForm.method}
                    onChange={(e) =>
                      setEditForm({ ...editForm, method: e.target.value })
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Amount ($)
                  </span>
                  <Input
                    inputMode="decimal"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Received By
                  </span>
                  <select
                    className={selectClass}
                    value={editForm.receivedBy}
                    onChange={(e) =>
                      setEditForm({ ...editForm, receivedBy: e.target.value })
                    }
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
