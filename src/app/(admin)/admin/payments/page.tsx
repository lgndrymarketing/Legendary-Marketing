"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, StatHeader } from "@/components/ui/firecrawl";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ClientPaymentModal,
  type EditablePayment,
} from "@/components/admin/client-payment-modal";
import { TrendCard } from "@/components/ui/monthly-trend";
import { rowCascade, rowItem } from "@/lib/motion";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";

interface Transaction {
  id: string;
  companyName: string | null;
  paymentType: "setup_fee" | "monthly_retainer";
  method: string;
  amount: number;
  partnerCut: number;
  receivedBy: string | null;
  receivedByName: string;
  splitStatus: "pending" | "settled";
  paidAt: string;
  notes: string | null;
}

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePayment | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/ledger")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function remove(t: Transaction) {
    if (
      !window.confirm(
        `Delete this ${usd(t.amount)} payment from ${t.companyName ?? "client"}?`
      )
    )
      return;
    await fetch(`/api/admin/client-payments/${t.id}`, { method: "DELETE" });
    load();
  }

  const now = new Date();
  const totalCollected = transactions.reduce((s, t) => s + t.amount, 0);
  const thisMonth = transactions
    .filter((t) => {
      const d = new Date(t.paidAt);
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth()
      );
    })
    .reduce((s, t) => s + t.amount, 0);
  const pendingSplits = transactions
    .filter((t) => t.splitStatus === "pending")
    .reduce((s, t) => s + Math.round((t.amount - t.partnerCut) / 2), 0);

  return (
    <div className="space-y-10">
      <PageHero
        title="Payments"
        description="Money collected from clients — setup fees and monthly retainers."
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Payment
          </Button>
        }
      />

      {/* Summary — hairline-divided 3-up */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatHeader
          className="px-5 py-6"
          title="Total Collected"
          caption="ALL TIME"
          value={totalCollected}
          format={usd}
        />
        <StatHeader
          className="px-5 py-6"
          title="This Month"
          caption="COLLECTED"
          value={thisMonth}
          format={usd}
        />
        <StatHeader
          className="px-5 py-6"
          title="Unsettled Splits"
          caption="OWED BETWEEN PARTNERS"
          value={pendingSplits}
          format={usd}
        />
      </div>

      {/* Trends — monthly collections + volume */}
      {!loading && transactions.length > 0 && (
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <TrendCard
            title="Collections"
            points={transactions.map((t) => ({
              date: t.paidAt,
              value: t.amount,
            }))}
            format={usd}
          />
          <TrendCard
            title="Payments Recorded"
            points={transactions.map((t) => ({ date: t.paidAt, value: 1 }))}
            format={(v) => Math.round(v).toLocaleString("en-US")}
          />
        </section>
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
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            description="Record payments against roster clients — each one feeds revenue and the partner ledger automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Date</th>
                  <th className="micro-label py-3 pr-4">Client</th>
                  <th className="micro-label py-3 pr-4">Type</th>
                  <th className="micro-label py-3 pr-4">Method</th>
                  <th className="micro-label py-3 pr-4">Amount</th>
                  <th className="micro-label py-3 pr-4">Received By</th>
                  <th className="micro-label py-3 pr-4">Notes</th>
                  <th className="py-3" />
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
                    className="group transition-colors hover:bg-muted/50"
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
                    <td className="py-3 pr-4 font-mono text-[11px] uppercase text-muted-foreground whitespace-nowrap">
                      {t.paymentType === "setup_fee" ? "Setup" : "Retainer"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {t.method}
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {usd(t.amount)}
                    </td>
                    <td className="py-3 pr-4">{t.receivedByName}</td>
                    <td
                      className="max-w-40 truncate py-3 pr-4 text-muted-foreground"
                      title={t.notes ?? undefined}
                    >
                      {t.notes ?? "—"}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditing({
                            id: t.id,
                            paymentType: t.paymentType,
                            method: t.method,
                            amount: t.amount,
                            receivedBy: t.receivedBy,
                            notes: t.notes,
                          });
                          setModalOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 cursor-pointer"
                        aria-label="Edit payment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(t)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 cursor-pointer"
                        aria-label="Delete payment"
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

      <ClientPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        payment={editing}
      />
    </div>
  );
}
