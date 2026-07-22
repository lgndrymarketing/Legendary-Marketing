"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
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
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ClientPaymentModal,
  type EditablePayment,
} from "@/components/admin/client-payment-modal";
import { ClientRoster } from "@/components/admin/client-roster";
import { TrendCard } from "@/components/ui/monthly-trend";
import { rowCascade, rowItem } from "@/lib/motion";
import { CreditCard, Filter, Plus, Pencil, Trash2, Users } from "lucide-react";

interface Transaction {
  id: string;
  companyName: string | null;
  paymentType: "setup_fee" | "monthly_retainer";
  method: string;
  amount: number;
  partnerCut: number;
  receivedBy: string | null;
  receivedByName: string;
  /** Profit-adjusted half owed to the other partner (from the ledger API). */
  otherPartnerCut: number;
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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [sort, setSort] = useState("date_desc");

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

  // Filters + sort drive the trends and the history table; the summary
  // tiles above stay global (they are labeled all-time / this-month).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = transactions.filter((t) => {
      if (typeFilter !== "all" && t.paymentType !== typeFilter) return false;
      if (statusFilter !== "all" && t.splitStatus !== statusFilter) return false;
      if (!inRange(t.paidAt, range)) return false;
      if (q) {
        const hay = [t.companyName, t.method, t.receivedByName, t.notes]
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
        : (new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()) * dir
    );
    return rows;
  }, [transactions, search, typeFilter, statusFilter, range, sort]);

  const filtersActive =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    range.preset !== "all";
  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0);

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
  // Profit-adjusted halves from the ledger API — expenses already deducted.
  const pendingSplits = transactions
    .filter((t) => t.splitStatus === "pending")
    .reduce((s, t) => s + t.otherPartnerCut, 0);

  return (
    <div className="space-y-10">
      <PageHero
        title="Clients & Payments"
        description="Manage your agency retainers, setup fees, and client statuses."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/clients">
                <Users className="mr-1.5 h-4 w-4" />
                Add Client
              </Link>
            </Button>
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
          </div>
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
          caption="OWED BETWEEN PARTNERS · AFTER EXPENSES"
          value={pendingSplits}
          format={usd}
        />
      </div>

      {/* Client roster — created on the Clients page, always in sync here.
          Recording a payment from a row refreshes the ledger below. */}
      <ClientRoster onChanged={load} />

      {/* Filter row — search + type/status pills, date range right-aligned.
          Drives the trends and the payment history below. */}
      {!loading && transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchPill
              className="lg:w-64"
              placeholder="Search client, method, notes…"
              value={search}
              onChange={setSearch}
            />
            <SelectPill
              className="lg:w-44"
              icon={Filter}
              ariaLabel="Payment type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All Types" },
                { value: "setup_fee", label: "Setup Fees" },
                { value: "monthly_retainer", label: "Retainers" },
              ]}
            />
            <SelectPill
              className="lg:w-44"
              icon={Filter}
              ariaLabel="Split status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Splits" },
                { value: "pending", label: "Pending Split" },
                { value: "settled", label: "Settled Split" },
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
              m={transactions.length}
              label={`FILTERED · ${usd(filteredTotal)} COLLECTED`}
            />
          )}
        </div>
      )}

      {/* Trends — monthly collections + volume */}
      {!loading && filtered.length > 0 && (
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <TrendCard
            title="Collections"
            points={filtered.map((t) => ({
              date: t.paidAt,
              value: t.amount,
            }))}
            format={usd}
          />
          <TrendCard
            title="Payments Recorded"
            points={filtered.map((t) => ({ date: t.paidAt, value: 1 }))}
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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={filtersActive ? "No matching payments" : "No payments yet"}
            description={
              filtersActive
                ? "No payments match the current filters — widen the date range or clear the search."
                : "Record payments against roster clients — each one feeds revenue and the partner ledger automatically."
            }
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
                {filtered.map((t) => (
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
