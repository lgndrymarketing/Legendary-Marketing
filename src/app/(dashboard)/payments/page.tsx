"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendCard } from "@/components/ui/monthly-trend";
import { rowCascade, rowItem, cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CreditCard, Send, X, CheckCircle2 } from "lucide-react";

interface BillingClient {
  id: string;
  companyName: string;
  package: string;
  packageLabel: string | null;
  setupFee: number;
  monthlyFee: number;
  startDate: string;
  nextDueDate: string | null;
  status: string;
}

interface PaymentRow {
  id: string;
  paymentType: "setup_fee" | "monthly_retainer";
  method: string;
  amount: number;
  paidAt: string;
}

const PAYMENT_METHODS = [
  "Payment link",
  "Zelle",
  "Apple Pay",
  "Cash App",
];

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function ClientPaymentsPage() {
  const [client, setClient] = useState<BillingClient | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    paymentType: "monthly_retainer",
    method: "Zelle",
    note: "",
  });

  const load = useCallback(() => {
    fetch("/api/client/billing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error && !data.empty) {
          setClient(data.client);
          setHistory(data.history ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/client/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: form.paymentType,
          method: form.method,
          note: form.note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Could not notify the team — try again.");
    } finally {
      setSaving(false);
    }
  }

  const daysLeft = client?.nextDueDate
    ? Math.ceil(
        (new Date(client.nextDueDate).getTime() - Date.now()) / 86_400_000
      )
    : null;
  const overdue = daysLeft !== null && daysLeft < 0;
  const dueAmount =
    client &&
    (form.paymentType === "setup_fee" ? client.setupFee : client.monthlyFee);

  return (
    <div className="space-y-10">
      <PageHero
        title="Payments"
        description="Your plan, upcoming payments, and payment history."
        action={
          client ? (
            <Button
              variant="glow"
              onClick={() => {
                setSent(false);
                setError(null);
                setPayOpen(true);
              }}
            >
              <Send className="mr-1.5 h-4 w-4" />
              Make a Payment
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : !client ? (
        <EmptyState
          icon={CreditCard}
          title="No billing profile yet"
          description="The LGNDRY team is setting up your plan. Your package and payment details will appear here."
        />
      ) : (
        <>
          {/* Plan band — hairline-divided 3-up */}
          <motion.section
            variants={cascade}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <motion.div variants={cascadeItem} className="px-5 py-6">
              <p className="micro-label">Your Plan</p>
              <p className="mt-2 text-2xl font-bold capitalize tracking-tight">
                {client.package === "custom" && client.packageLabel
                  ? client.packageLabel
                  : client.package}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Since{" "}
                {new Date(client.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </motion.div>
            <motion.div variants={cascadeItem} className="px-5 py-6">
              <p className="micro-label">Monthly Retainer</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {usd(client.monthlyFee)}
                <span className="text-base font-semibold text-muted-foreground">
                  /mo
                </span>
              </p>
            </motion.div>
            <motion.div variants={cascadeItem} className="px-5 py-6">
              <p className="micro-label">Next Payment Due</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tracking-tight",
                  overdue && "text-destructive"
                )}
              >
                {client.nextDueDate
                  ? new Date(client.nextDueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </p>
              {daysLeft !== null && (
                <p
                  className={cn(
                    "mt-1 font-mono text-[11px]",
                    overdue
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {overdue
                    ? `${-daysLeft} day${daysLeft === -1 ? "" : "s"} overdue`
                    : `in ${daysLeft} days`}
                </p>
              )}
            </motion.div>
          </motion.section>

          {/* Trends — what you've paid, month by month */}
          {history.length > 0 && (
            <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <TrendCard
                title="Amount Paid"
                points={history.map((p) => ({
                  date: p.paidAt,
                  value: p.amount,
                }))}
                format={usd}
              />
              <TrendCard
                title="Payments Made"
                points={history.map((p) => ({ date: p.paidAt, value: 1 }))}
                format={(v) => Math.round(v).toLocaleString("en-US")}
              />
            </section>
          )}

          {/* History */}
          <section>
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CreditCard className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">Payment History</h2>
            </div>
            {history.length === 0 ? (
              <p className="pt-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="micro-label py-3 pr-4">Date</th>
                      <th className="micro-label py-3 pr-4">Type</th>
                      <th className="micro-label py-3 pr-4">Method</th>
                      <th className="micro-label py-3">Amount</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={rowCascade}
                    initial="hidden"
                    animate="visible"
                    className="divide-y divide-border"
                  >
                    {history.map((p) => (
                      <motion.tr key={p.id} variants={rowItem}>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(p.paidAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          {p.paymentType === "setup_fee"
                            ? "Setup Fee"
                            : "Monthly Retainer"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {p.method}
                        </td>
                        <td className="py-3 font-mono font-semibold">
                          {usd(p.amount)}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Make a payment modal */}
      <AnimatePresence>
        {payOpen && client && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-xl"
              onClick={() => setPayOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submit}
              className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-2">
                <h2 className="text-xl font-bold tracking-tight">
                  Make a Payment
                </h2>
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {sent ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                  <p className="mt-4 text-lg font-semibold">
                    The team has been notified
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll verify your payment and it will appear in your
                    history shortly.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => setPayOpen(false)}
                    type="button"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <p className="pb-6 text-sm text-muted-foreground">
                    Send your payment using the method agreed with the LGNDRY
                    team, then confirm below — we&apos;ll verify and record it.
                  </p>

                  <div className="space-y-4">
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
                          <option value="monthly_retainer">
                            Monthly Retainer ({usd(client.monthlyFee)})
                          </option>
                          <option value="setup_fee">
                            Setup Fee ({usd(client.setupFee)})
                          </option>
                        </select>
                      </div>
                      <div>
                        <span className="mb-1.5 block text-[13px] font-medium">
                          Method Used
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
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[13px] font-medium">
                        Note (optional)
                      </span>
                      <Input
                        placeholder="e.g. sent from account ending 4421"
                        value={form.note}
                        onChange={(e) =>
                          setForm({ ...form, note: e.target.value })
                        }
                      />
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Amount due:{" "}
                      {dueAmount !== null && dueAmount !== undefined
                        ? usd(dueAmount)
                        : "—"}
                    </p>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPayOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="glow" disabled={saving}>
                      {saving ? "Sending…" : "I've Sent This Payment"}
                    </Button>
                  </div>
                </>
              )}
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
