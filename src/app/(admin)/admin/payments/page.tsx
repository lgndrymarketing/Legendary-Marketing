"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, StatHeader } from "@/components/ui/firecrawl";
import { TableSkeleton } from "@/components/ui/skeleton";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientEmail: string | null;
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

// Same semantics as the old badge variants, rendered as uppercase mono text.
const statusClass = (status: string): string =>
  status === "completed"
    ? "text-success"
    : status === "pending"
    ? "text-warning"
    : status === "failed" || status === "refunded"
    ? "text-destructive"
    : "text-muted-foreground";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PaymentsResponse | null) => {
        if (data && Array.isArray(data.payments)) {
          setPayments(data.payments);
          if (data.summary) setSummary(data.summary);
        }
      })
      .catch(() => {
        /* leave empty state in place */
      })
      .finally(() => setLoading(false));
  }, []);

  const clientName = (p: PaymentRow) => {
    const name = [p.clientFirstName, p.clientLastName].filter(Boolean).join(" ");
    return name || p.clientEmail || "—";
  };

  return (
    <div className="space-y-10">
      <PageHero title="Payments" description="Track all payments and revenue." />

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
            description="Payments will appear here as invoices sync in from GoHighLevel."
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
                  <th className="micro-label py-3">Date</th>
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
                    className="transition-colors hover:bg-muted/50"
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
                        {payment.source === "ghl" ? "GoHighLevel" : "Portal"}
                      </Badge>
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(payment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
