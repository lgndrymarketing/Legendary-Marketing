"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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

const statusVariant = (status: string): "success" | "warning" | "destructive" | "secondary" =>
  status === "completed"
    ? "success"
    : status === "pending"
    ? "warning"
    : status === "failed" || status === "refunded"
    ? "destructive"
    : "secondary";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Payments</h1>
        <p className="text-muted-foreground mt-1">Track all payments and revenue.</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">{formatCents(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-3xl font-bold text-success mt-1">
              {formatCents(summary.paid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-3xl font-bold text-warning mt-1">
              {formatCents(summary.pending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <EmptyState icon={CreditCard} title="Loading payments..." description="" />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Payments will appear here as clients check out via Creem or as invoices sync in from GoHighLevel."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Source</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium">{clientName(payment)}</td>
                      <td className="py-3 text-muted-foreground">
                        {payment.projectName ?? "—"}
                      </td>
                      <td className="py-3 font-semibold">
                        {formatCents(payment.amount)}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={payment.source === "ghl" ? "orange" : "secondary"}
                        >
                          {payment.source === "ghl" ? "GoHighLevel" : "Creem"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
