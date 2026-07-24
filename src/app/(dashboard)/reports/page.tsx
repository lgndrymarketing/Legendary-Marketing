"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendCard } from "@/components/ui/monthly-trend";
import { rowCascade, rowItem, cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ClipboardCheck } from "lucide-react";
import { FocusBeam } from "@/components/ui/beam-focus";

/**
 * Weekly Reports — the client half of the reporting loop. The agency enters
 * leads + CPL; pending reports surface here for the client to add closes and
 * revenue, completing the week and feeding the true-ROAS totals.
 */

interface Report {
  id: string;
  weekStart: string;
  weekEnd: string;
  leads: number;
  cpl: number;
  totalSpend: number;
  closes: number | null;
  revenue: number | null;
  status: "pending_client" | "completed";
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDay = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default function ClientReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/client/weekly-reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.reports)) setReports(data.reports);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const pending = reports.filter((r) => r.status === "pending_client");
  const completed = reports.filter((r) => r.status === "completed");

  // All-time totals over completed weeks; ROAS = revenue / ad spend.
  const totalLeads = completed.reduce((s, r) => s + r.leads, 0);
  const totalSpend = completed.reduce((s, r) => s + r.totalSpend, 0);
  const totalRevenue = completed.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const tiles = [
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString("en-US"),
    },
    { label: "Avg CPL", value: usd(avgCpl) },
    { label: "Total Ad Spend", value: usd(totalSpend) },
    {
      label: "Total Revenue",
      value: usd(totalRevenue),
      accent: "text-success",
    },
    {
      label: "ROAS",
      value: `${roas.toFixed(2)}x`,
      accent: "text-orange",
    },
  ];

  return (
    <div className="space-y-10">
      <PageHero
        title="Weekly Reports"
        description="Your ad results week by week — add your closes and revenue to see true return on ad spend."
      />

      {/* All-time totals — hairline-divided band */}
      {completed.length > 0 && (
        <motion.section
          variants={cascade}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-5 sm:divide-x"
        >
          {tiles.map((t) => (
            <motion.div key={t.label} variants={cascadeItem} className="px-5 py-6">
              <p className="micro-label">{t.label}</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tracking-tight",
                  t.accent
                )}
              >
                {t.value}
              </p>
            </motion.div>
          ))}
        </motion.section>
      )}

      {/* Action required — pending weeks */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <BracketLabel
            n={pending.length}
            label="ACTION REQUIRED · ADD YOUR SALES NUMBERS"
          />
          {pending.map((r) => (
            <PendingReportForm key={r.id} report={r} onDone={load} />
          ))}
        </section>
      )}

      {/* Trends over completed weeks */}
      {completed.length > 1 && (
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <TrendCard
            title="Leads per Week"
            points={completed.map((r) => ({ date: r.weekEnd, value: r.leads }))}
            format={(v) => Math.round(v).toLocaleString("en-US")}
          />
          <TrendCard
            title="Revenue per Week"
            points={completed.map((r) => ({
              date: r.weekEnd,
              value: r.revenue ?? 0,
            }))}
            format={usd}
          />
        </section>
      )}

      {/* History */}
      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ClipboardCheck className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Report History</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={4} />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No reports yet"
            description="Your agency posts your ad results here every week — check back after your first week of ads."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Week</th>
                  <th className="micro-label py-3 pr-4 text-right">Leads</th>
                  <th className="micro-label py-3 pr-4 text-right">CPL</th>
                  <th className="micro-label py-3 pr-4 text-right">Ad Spend</th>
                  <th className="micro-label py-3 pr-4 text-right">Closes</th>
                  <th className="micro-label py-3 pr-4 text-right">Revenue</th>
                  <th className="micro-label py-3">Status</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {reports.map((r) => (
                  <motion.tr key={r.id} variants={rowItem}>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDay(r.weekStart)} – {fmtDay(r.weekEnd)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold">
                      {r.leads.toLocaleString("en-US")}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {usd(r.cpl)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {usd(r.totalSpend)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {r.closes !== null
                        ? r.closes.toLocaleString("en-US")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {r.revenue !== null ? (
                        <span className="text-success">{usd(r.revenue)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
                          r.status === "pending_client"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        )}
                      >
                        {r.status === "pending_client"
                          ? "Needs Your Input"
                          : "Completed"}
                      </span>
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

/** Inline completion form for one pending week. */
function PendingReportForm({
  report,
  onDone,
}: {
  report: Report;
  onDone: () => void;
}) {
  const [closes, setCloses] = useState("");
  const [revenue, setRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const closesNum = parseInt(closes, 10);
    const revenueCents = Math.round(parseFloat(revenue) * 100);
    if (!Number.isFinite(closesNum) || closesNum < 0) {
      setError("Enter how many clients you closed.");
      return;
    }
    if (!Number.isFinite(revenueCents) || revenueCents < 0) {
      setError("Enter the revenue those closes generated.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/client/weekly-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          closes: closesNum,
          revenue: revenueCents,
        }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError("Could not save — try again.");
      setSaving(false);
    }
  }

  return (
    <FocusBeam>
    <form
      onSubmit={submit}
      className="rounded-xl border border-orange/30 bg-accent/40 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          Week of {fmtDay(report.weekStart)} – {fmtDay(report.weekEnd)}
        </p>
        <p className="font-mono text-[11px] uppercase text-muted-foreground">
          {report.leads.toLocaleString("en-US")} leads · {usd(report.cpl)} CPL ·{" "}
          {usd(report.totalSpend)} spend
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium">
            Clients Closed
          </span>
          <Input
            inputMode="numeric"
            placeholder="e.g. 4"
            value={closes}
            onChange={(e) => setCloses(e.target.value)}
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium">
            Revenue Generated ($)
          </span>
          <Input
            inputMode="decimal"
            placeholder="e.g. 6000"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "Complete Report"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
    </FocusBeam>
  );
}
