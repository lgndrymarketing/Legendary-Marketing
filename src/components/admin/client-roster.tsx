"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  Users,
  Pencil,
  X,
  Trash2,
  CircleCheck,
  Search,
  Pause,
  Play,
} from "lucide-react";

interface ClientRow {
  id: string;
  contactName: string;
  companyName: string;
  businessType: string | null;
  package: "bronze" | "silver" | "gold" | "diamond" | "custom";
  packageLabel: string | null;
  setupFee: number;
  monthlyFee: number;
  partnerCut: number;
  startDate: string;
  nextDueDate: string | null;
  status: "active" | "paused" | "churned";
  userId: string | null;
  notes: string | null;
  portalEmail: string | null;
}

interface PortalUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface AdminOption {
  id: string;
  name: string;
}

import { PAYMENT_METHODS, FEE_METHOD } from "@/lib/payment-methods";

/** Whole days until the due date; negative = overdue. */
function daysLeft(due: string | null): number | null {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

const BUSINESS_TYPES = [
  "Car Rental",
  "Home Services",
  "Coach",
  "Consultant",
  "Credit Repair",
  "Tax Advisory",
  "Legal",
  "E-commerce",
  "Dental",
  "Chiropractic",
  "Med Spa",
  "Custom…",
];

const PACKAGES = ["bronze", "silver", "gold", "diamond", "custom"] as const;
const STATUSES = ["active", "paused", "churned"] as const;

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const packageBadge: Record<ClientRow["package"], string> = {
  bronze: "bg-muted text-foreground",
  silver: "border border-border bg-background text-muted-foreground",
  gold: "bg-orange/10 text-orange",
  diamond: "bg-foreground text-background",
  custom: "border border-dashed border-border bg-background text-foreground",
};

const statusClass = (s: string) =>
  s === "active"
    ? "text-success"
    : s === "paused"
    ? "text-warning"
    : "text-destructive";

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

const emptyForm = {
  contactName: "",
  companyName: "",
  businessType: "Coach",
  businessTypeCustom: "",
  package: "gold" as string,
  packageLabel: "",
  setupFee: "",
  monthlyFee: "",
  partnerCut: "0",
  startDate: "",
  nextDueDate: "",
  status: "active" as string,
  userId: "",
  notes: "",
  setupFeePaid: false,
  setupReceivedBy: "",
  setupMethod: "Zelle",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </div>
  );
}

/**
 * The agency client roster — search, status filter, header totals, per-row
 * actions (record payment, edit, pause/resume, delete), plus the add/edit
 * and record-payment modals. Shared by the Clients page (which can create
 * clients via `addTrigger`) and the Clients & Payments page, so both always
 * show the same synced roster.
 */
export function ClientRoster({
  addTrigger = 0,
  onChanged,
}: {
  /** Increment to open the Add Client modal from outside (e.g. a hero button). */
  addTrigger?: number;
  /** Called after any mutation (client saved/deleted, payment recorded). */
  onChanged?: () => void;
}) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFor, setPaymentFor] = useState<ClientRow | null>(null);
  const [payForm, setPayForm] = useState({
    paymentType: "monthly_retainer",
    method: PAYMENT_METHODS[0],
    receivedBy: "",
    fees: "",
  });

  const load = useCallback(() => {
    fetch("/api/admin/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.clients)) {
          setClients(data.clients);
          setPortalUsers(data.portalUsers ?? []);
          setAdmins(data.admins ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const changed = useCallback(() => {
    load();
    onChanged?.();
  }, [load, onChanged]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, startDate: new Date().toISOString().slice(0, 10) });
    setError(null);
    setModalOpen(true);
  }

  useEffect(() => {
    if (addTrigger > 0) openAdd();
  }, [addTrigger]);

  function openEdit(c: ClientRow) {
    setEditingId(c.id);
    setForm({
      contactName: c.contactName,
      companyName: c.companyName,
      businessType:
        c.businessType && BUSINESS_TYPES.includes(c.businessType)
          ? c.businessType
          : "Custom…",
      businessTypeCustom:
        c.businessType && !BUSINESS_TYPES.includes(c.businessType)
          ? c.businessType
          : "",
      package: c.package,
      packageLabel: c.packageLabel ?? "",
      setupFee: String(c.setupFee / 100),
      monthlyFee: String(c.monthlyFee / 100),
      partnerCut: String(c.partnerCut / 100),
      startDate: c.startDate.slice(0, 10),
      nextDueDate: c.nextDueDate ? c.nextDueDate.slice(0, 10) : "",
      status: c.status,
      userId: c.userId ?? "",
      notes: c.notes ?? "",
      setupFeePaid: false,
      setupReceivedBy: "",
      setupMethod: "Zelle",
    });
    setError(null);
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactName.trim() || !form.companyName.trim()) {
      setError("Contact and company name are required.");
      return;
    }
    const cents = (v: string) => Math.round((parseFloat(v) || 0) * 100);
    const setupFeeCents = cents(form.setupFee);
    if (!editingId && form.setupFeePaid) {
      if (setupFeeCents <= 0) {
        setError("Enter a setup fee before marking it paid.");
        return;
      }
      if (!form.setupReceivedBy) {
        setError("Pick who received the setup fee.");
        return;
      }
    }
    const payload = {
      contactName: form.contactName.trim(),
      companyName: form.companyName.trim(),
      businessType:
        form.businessType === "Custom…"
          ? form.businessTypeCustom.trim() || "Custom"
          : form.businessType,
      package: form.package,
      packageLabel:
        form.package === "custom" ? form.packageLabel.trim() || null : null,
      setupFee: cents(form.setupFee),
      monthlyFee: cents(form.monthlyFee),
      partnerCut: cents(form.partnerCut),
      startDate: new Date(form.startDate + "T00:00:00Z").toISOString(),
      nextDueDate: form.nextDueDate
        ? new Date(form.nextDueDate + "T00:00:00Z").toISOString()
        : null,
      status: form.status,
      userId: form.userId || null,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/admin/clients/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();

      // "Setup fee already paid" → log the setup payment against the new
      // client, which auto-generates the 50/50 partner split on the ledger.
      if (!editingId && form.setupFeePaid && setupFeeCents > 0) {
        const created = await res.json().catch(() => null);
        if (created?.id) {
          await fetch(`/api/admin/clients/${created.id}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentType: "setup_fee",
              method: form.setupMethod,
              receivedBy: form.setupReceivedBy,
            }),
          });
        }
      }

      setModalOpen(false);
      changed();
    } catch {
      setError("Could not save the client — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentFor) return;
    setError(null);
    if (!payForm.receivedBy) {
      setError("Pick who received the payment.");
      return;
    }
    const feeCents =
      payForm.method === FEE_METHOD && payForm.fees.trim()
        ? Math.round(parseFloat(payForm.fees) * 100)
        : undefined;
    if (feeCents !== undefined && (!Number.isFinite(feeCents) || feeCents < 0)) {
      setError("Enter the payment link fees (or leave blank).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${paymentFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: payForm.paymentType,
          method: payForm.method,
          receivedBy: payForm.receivedBy,
          ...(feeCents !== undefined && feeCents > 0 && { fees: feeCents }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      setPaymentFor(null);
      changed();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "failed"
          ? err.message
          : "Could not record the payment — try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(c: ClientRow) {
    const status = c.status === "paused" ? "active" : "paused";
    await fetch(`/api/admin/clients/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    changed();
  }

  async function removeClient(c: ClientRow) {
    if (
      !window.confirm(
        `Delete ${c.companyName}? Their payment history goes with them.`
      )
    )
      return;
    await fetch(`/api/admin/clients/${c.id}`, { method: "DELETE" });
    changed();
  }

  const visible = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.companyName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q);
    const dl = daysLeft(c.nextDueDate);
    const isOverdue = c.status === "active" && dl !== null && dl < 0;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue" ? isOverdue : c.status === statusFilter);
    return matchesQuery && matchesStatus;
  });

  const setupTotal = visible.reduce((s, c) => s + c.setupFee, 0);
  const mrrTotal = visible
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <>
      <section>
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <BracketLabel n={visible.length} label="CLIENTS" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 w-56 rounded-full pl-9"
                placeholder="Search clients or companies…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client with their package and retainer — Financials builds MRR and package metrics from this roster."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left align-top">
                  <th className="micro-label py-3 pr-4">Client &amp; Company</th>
                  <th className="micro-label py-3 pr-4">Package</th>
                  <th className="py-3 pr-4">
                    <span className="micro-label block">Setup</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {usd(setupTotal)}
                    </span>
                  </th>
                  <th className="py-3 pr-4">
                    <span className="micro-label block">MRR</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {usd(mrrTotal)}
                    </span>
                  </th>
                  <th className="micro-label py-3 pr-4">Start Date</th>
                  <th className="micro-label py-3 pr-4">Next Due</th>
                  <th className="micro-label py-3 pr-4">Days Left</th>
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
                {visible.map((client) => {
                  const dl = daysLeft(client.nextDueDate);
                  const isOverdue =
                    client.status === "active" && dl !== null && dl < 0;
                  return (
                    <motion.tr
                      key={client.id}
                      variants={rowItem}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.contactName}
                        </p>
                        {client.businessType && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {client.businessType}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                            packageBadge[client.package]
                          )}
                        >
                          {client.package === "custom" && client.packageLabel
                            ? client.packageLabel
                            : client.package}
                        </span>
                        {client.partnerCut > 0 && (
                          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                            Partner cut: {usd(client.partnerCut)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-muted-foreground">
                        {usd(client.setupFee)}
                      </td>
                      <td className="py-3 pr-4 font-mono font-semibold">
                        {usd(client.monthlyFee)}
                        <span className="font-normal text-muted-foreground">
                          /mo
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(client.startDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-4 font-mono text-xs whitespace-nowrap",
                          isOverdue
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {client.nextDueDate
                          ? new Date(client.nextDueDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-4 font-mono text-xs whitespace-nowrap",
                          isOverdue
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {dl === null
                          ? "—"
                          : dl < 0
                          ? `${-dl} day${dl === -1 ? "" : "s"} overdue`
                          : `${dl} days`}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "font-mono text-[11px] font-semibold uppercase tracking-wide",
                            isOverdue
                              ? "text-destructive"
                              : statusClass(client.status)
                          )}
                        >
                          {isOverdue ? "Overdue" : client.status}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setPaymentFor(client);
                            setPayForm({
                              paymentType: "monthly_retainer",
                              method: PAYMENT_METHODS[0],
                              receivedBy: admins[0]?.id ?? "",
                              fees: "",
                            });
                            setError(null);
                          }}
                          className="rounded-lg border border-border p-1.5 text-foreground transition-colors hover:bg-success/10 hover:text-success hover:border-success/40 cursor-pointer"
                          aria-label={`Record payment for ${client.companyName}`}
                          title="Record payment"
                        >
                          <CircleCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(client)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                          aria-label={`Edit ${client.companyName}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {client.status !== "churned" && (
                          <button
                            onClick={() => togglePause(client)}
                            className={cn(
                              "rounded-md p-1.5 text-muted-foreground transition-colors cursor-pointer",
                              client.status === "paused"
                                ? "hover:bg-success/10 hover:text-success"
                                : "hover:bg-warning/10 hover:text-warning"
                            )}
                            aria-label={
                              client.status === "paused"
                                ? `Resume ${client.companyName}`
                                : `Pause ${client.companyName}`
                            }
                            title={
                              client.status === "paused" ? "Resume" : "Pause"
                            }
                          >
                            {client.status === "paused" ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => removeClient(client)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          aria-label={`Delete ${client.companyName}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record payment modal */}
      <AnimatePresence>
        {paymentFor && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setPaymentFor(null)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={recordPayment}
              className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-1">
                <h2 className="text-xl font-bold tracking-tight">
                  Record Payment
                </h2>
                <button
                  type="button"
                  onClick={() => setPaymentFor(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="pb-6 font-mono text-[11px] text-muted-foreground">
                {paymentFor.companyName} ·{" "}
                {payForm.paymentType === "setup_fee"
                  ? `${usd(paymentFor.setupFee)} setup fee`
                  : `${usd(paymentFor.monthlyFee)} monthly retainer`}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Payment Type">
                  <select
                    className={selectClass}
                    value={payForm.paymentType}
                    onChange={(e) =>
                      setPayForm({ ...payForm, paymentType: e.target.value })
                    }
                  >
                    <option value="setup_fee">Setup Fee</option>
                    <option value="monthly_retainer">Monthly Retainer</option>
                  </select>
                </Field>
                <Field label="Payment Method">
                  <select
                    className={selectClass}
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, method: e.target.value })
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {payForm.method === FEE_METHOD && (
                <div className="mt-4">
                  <Field label="Payment Link Fees ($)">
                    <Input
                      inputMode="decimal"
                      placeholder="e.g. 12.40"
                      value={payForm.fees}
                      onChange={(e) =>
                        setPayForm({ ...payForm, fees: e.target.value })
                      }
                    />
                  </Field>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    Booked as its own one-time expense (category: Fees) on
                    the P&amp;L. Splits stay on the full collected amount.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Field label="Received By">
                  <select
                    className={selectClass}
                    value={payForm.receivedBy}
                    onChange={(e) =>
                      setPayForm({ ...payForm, receivedBy: e.target.value })
                    }
                  >
                    <option value="">Select partner…</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                  Who received this payment directly? The split lands on the
                  Partner Ledger.
                </p>
              </div>

              {payForm.paymentType === "monthly_retainer" && (
                <p className="mt-4 font-mono text-[10px] text-muted-foreground">
                  Recording a retainer moves the next due date one month out.
                </p>
              )}

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentFor(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Confirm Payment"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Add / edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submit}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <h2 className="text-xl font-bold tracking-tight">
                  {editingId ? "Edit Client" : "Add New Client"}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contact Name" required>
                  <Input
                    placeholder="John Doe"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Company Name" required>
                  <Input
                    placeholder="Acme Corp"
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Business Type">
                  <select
                    className={selectClass}
                    value={form.businessType}
                    onChange={(e) =>
                      setForm({ ...form, businessType: e.target.value })
                    }
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {form.businessType === "Custom…" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom type"
                      value={form.businessTypeCustom}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          businessTypeCustom: e.target.value,
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Package">
                  <select
                    className={selectClass}
                    value={form.package}
                    onChange={(e) =>
                      setForm({ ...form, package: e.target.value })
                    }
                  >
                    {PACKAGES.map((p) => (
                      <option key={p} value={p}>
                        {p === "custom"
                          ? "Custom…"
                          : p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  {form.package === "custom" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom package name"
                      value={form.packageLabel}
                      onChange={(e) =>
                        setForm({ ...form, packageLabel: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Setup Fee ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="1500"
                    value={form.setupFee}
                    onChange={(e) =>
                      setForm({ ...form, setupFee: e.target.value })
                    }
                  />
                </Field>
                <Field label="Monthly Fee ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="500"
                    value={form.monthlyFee}
                    onChange={(e) =>
                      setForm({ ...form, monthlyFee: e.target.value })
                    }
                  />
                </Field>
                <Field label="Partner Cut ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={form.partnerCut}
                    onChange={(e) =>
                      setForm({ ...form, partnerCut: e.target.value })
                    }
                  />
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    Deducted before 50/50 split
                  </p>
                </Field>
              </div>

              {/* Setup fee already paid — logs the payment + partner split
                  the moment the client is created (add mode only). */}
              {!editingId && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.setupFeePaid}
                      onChange={(e) =>
                        setForm({ ...form, setupFeePaid: e.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 accent-orange cursor-pointer"
                    />
                    <span>
                      <span className="block text-[13px] font-medium">
                        Setup fee already paid
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        Logs the setup payment and generates the partner split
                        instantly.
                      </span>
                    </span>
                  </label>
                  {form.setupFeePaid && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Received By" required>
                        <select
                          className={selectClass}
                          value={form.setupReceivedBy}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              setupReceivedBy: e.target.value,
                            })
                          }
                        >
                          <option value="">Select partner…</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Payment Method">
                        <select
                          className={selectClass}
                          value={form.setupMethod}
                          onChange={(e) =>
                            setForm({ ...form, setupMethod: e.target.value })
                          }
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Next Due Date">
                  <Input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) =>
                      setForm({ ...form, nextDueDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Portal Account (optional)">
                  <select
                    className={selectClass}
                    value={form.userId}
                    onChange={(e) =>
                      setForm({ ...form, userId: e.target.value })
                    }
                  >
                    <option value="">Not linked</option>
                    {portalUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {[u.firstName, u.lastName]
                          .filter(Boolean)
                          .join(" ") || u.email}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Notes">
                  <Input
                    placeholder="Anything worth remembering about this client"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </Field>
              </div>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Client"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
