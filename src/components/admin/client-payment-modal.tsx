"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export const PAYMENT_METHODS = [
  "Zelle",
  "CashApp",
  "Venmo",
  "Wire",
  "Card",
  "Cash",
  "Other",
];

export interface RosterClient {
  id: string;
  companyName: string;
  setupFee: number;
  monthlyFee: number;
}

export interface EditablePayment {
  id: string;
  paymentType: "setup_fee" | "monthly_retainer";
  method: string;
  amount: number;
  receivedBy: string | null;
  notes?: string | null;
}

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * Record / edit a client payment. Create mode picks the roster client and
 * derives the amount from their fee (overridable); edit mode patches an
 * existing payment. Shared by the Payments, Clients, and Partner Ledger pages.
 */
export function ClientPaymentModal({
  open,
  onClose,
  onSaved,
  payment,
  presetClientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, the modal edits this payment instead of creating one. */
  payment?: EditablePayment | null;
  /** Create mode: preselect a roster client. */
  presetClientId?: string;
}) {
  const [clients, setClients] = useState<RosterClient[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    paymentType: "monthly_retainer",
    method: "Zelle",
    receivedBy: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch("/api/admin/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setClients(data.clients ?? []);
        setAdmins(data.admins ?? []);
        setForm((f) => ({
          ...f,
          clientId: payment ? "" : presetClientId ?? f.clientId,
          paymentType: payment?.paymentType ?? "monthly_retainer",
          method: payment?.method ?? "Zelle",
          receivedBy: payment?.receivedBy ?? data.admins?.[0]?.id ?? "",
          amount: payment ? String(payment.amount / 100) : "",
          notes: payment?.notes ?? "",
        }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment?.id, presetClientId]);

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const defaultAmount = selectedClient
    ? form.paymentType === "setup_fee"
      ? selectedClient.setupFee
      : selectedClient.monthlyFee
    : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!payment && !form.clientId) {
      setError("Pick a client.");
      return;
    }
    if (!form.receivedBy) {
      setError("Pick who received the payment.");
      return;
    }
    const override = form.amount.trim()
      ? Math.round(parseFloat(form.amount) * 100)
      : undefined;
    if (override !== undefined && (!Number.isFinite(override) || override <= 0)) {
      setError("Enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      const res = payment
        ? await fetch(`/api/admin/client-payments/${payment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentType: form.paymentType,
              method: form.method,
              receivedBy: form.receivedBy,
              ...(override !== undefined && { amount: override }),
              notes: form.notes.trim() || null,
            }),
          })
        : await fetch(`/api/admin/clients/${form.clientId}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentType: form.paymentType,
              method: form.method,
              receivedBy: form.receivedBy,
              ...(override !== undefined && { amount: override }),
              notes: form.notes.trim() || undefined,
            }),
          });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      onClose();
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "failed"
          ? err.message
          : "Could not save the payment — try again."
      );
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
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            onSubmit={submit}
            className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
          >
            <div className="flex items-start justify-between pb-6">
              <h2 className="text-xl font-bold tracking-tight">
                {payment ? "Edit Payment" : "Record Payment"}
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
              {!payment && (
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Client <span className="text-destructive">*</span>
                  </span>
                  <select
                    className={selectClass}
                    value={form.clientId}
                    onChange={(e) =>
                      setForm({ ...form, clientId: e.target.value })
                    }
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Payment Type
                  </span>
                  <select
                    className={selectClass}
                    value={form.paymentType}
                    onChange={(e) =>
                      setForm({ ...form, paymentType: e.target.value })
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
                    value={form.method}
                    onChange={(e) =>
                      setForm({ ...form, method: e.target.value })
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
                    Received By
                  </span>
                  <select
                    className={selectClass}
                    value={form.receivedBy}
                    onChange={(e) =>
                      setForm({ ...form, receivedBy: e.target.value })
                    }
                  >
                    <option value="">Select partner…</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
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
                    placeholder={
                      !payment && defaultAmount > 0
                        ? `${usd(defaultAmount)} (default)`
                        : "Amount"
                    }
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[13px] font-medium">
                  Notes
                </span>
                <Input
                  placeholder="e.g. wire ref, partial payment"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {!payment && form.paymentType === "monthly_retainer" && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  Recording a retainer moves the client&apos;s next due date one
                  month out. The split lands on the Partner Ledger.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : payment
                  ? "Save"
                  : "Confirm Payment"}
              </Button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
