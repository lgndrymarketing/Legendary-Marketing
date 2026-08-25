"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Beam } from "@/components/ui/beam-focus";
import { rowCascade, rowItem, cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Plus } from "lucide-react";

/**
 * Weekly Report — the client half of the reporting loop. The agency enters
 * leads + CPL from data entry; the client adds closes and revenue here,
 * which completes the week and feeds true ROAS.
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

const weekLabel = (r: Report) =>
  `${fmtDay(r.weekStart)} – ${fmtDay(r.weekEnd)}`;

export default function ClientReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  /** Which pending week the form is filling in. */
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const pending = useMemo(
    () =>
      reports
        .filter((r) => r.status === "pending_client")
        // Oldest outstanding week first — that's the one to clear next.
        .sort((a, b) => a.weekEnd.localeCompare(b.weekEnd)),
    [reports]
  );
  const completed = reports.filter((r) => r.status === "completed");

  const active =
    pending.find((r) => r.id === activeId) ?? pending[0] ?? null;

  // All-time totals over completed weeks; ROAS = revenue / ad spend.
  const totalLeads = completed.reduce((s, r) => s + r.leads, 0);
  const totalSpend = completed.reduce((s, r) => s + r.totalSpend, 0);
  const totalRevenue = completed.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalCloses = completed.reduce((s, r) => s + (r.closes ?? 0), 0);
  const avgTicket =
    totalCloses > 0 ? Math.round(totalRevenue / totalCloses) : 0;
  const avgCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const tiles = [
    { label: "Total Leads", value: totalLeads.toLocaleString("en-US") },
    { label: "Avg CPL", value: usd(avgCpl) },
    { label: "Total Ad Spend", value: usd(totalSpend) },
    { label: "Avg Ticket", value: usd(avgTicket) },
    { label: "Total Revenue", value: usd(totalRevenue), accent: "text-success" },
    { label: "ROAS", value: `${roas.toFixed(2)}x`, accent: "text-orange" },
  ];

  return (
    <div className="space-y-10">
      <PageHero
        title="Weekly Report"
        description="Update your sales results to track ROI and ROAS."
      />

      {/* All-time totals — hairline-divided band */}
      {completed.length > 0 && (
        <motion.section
          variants={cascade}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-6 sm:divide-x"
        >
          {tiles.map((t) => (
            <motion.div key={t.label} variants={cascadeItem} className="px-5 py-6">
              <p className="micro-label">{t.label}</p>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", t.accent)}>
                {t.value}
              </p>
            </motion.div>
          ))}
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[22rem_1fr] lg:items-start">
        {/* Submit Results — the oldest week still waiting on them */}
        <div>
          {loading ? (
            <div className="h-64 rounded-xl border border-border" />
          ) : active ? (
            <SubmitResults
              key={active.id}
              report={active}
              outstanding={pending.length}
              onDone={load}
            />
          ) : (
            <div className="rounded-xl border border-border p-5">
              <h2 className="text-[15px] font-bold tracking-tight">
                Submit Results
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {reports.length === 0
                  ? "Your agency posts your ad results here every week — check back after your first week of ads."
                  : "You're all caught up. The next week lands here once your agency posts it."}
              </p>
            </div>
          )}
        </div>

        {/* Reporting History */}
        <section>
          <div className="border-b border-border pb-3">
            <h2 className="text-[15px] font-bold tracking-tight">
              Reporting History
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Past weeks results and ROI.
            </p>
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
                    <th className="micro-label py-3 pr-4 text-right">Closed</th>
                    <th className="micro-label py-3 pr-4 text-right">
                      Avg Ticket
                    </th>
                    <th className="micro-label py-3 pr-4 text-right">Revenue</th>
                    <th className="micro-label py-3 pr-4 text-right">ROAS</th>
                    <th className="micro-label py-3">Status</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={rowCascade}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border"
                >
                  {reports.map((r) => {
                    const isPending = r.status === "pending_client";
                    const rowRoas =
                      r.revenue !== null && r.totalSpend > 0
                        ? r.revenue / r.totalSpend
                        : null;
                    return (
                      <motion.tr
                        key={r.id}
                        variants={rowItem}
                        // A pending row loads that week into the form —
                        // otherwise only the oldest one is ever reachable.
                        onClick={() => isPending && setActiveId(r.id)}
                        className={cn(
                          "transition-colors",
                          isPending && "cursor-pointer hover:bg-muted/50",
                          active?.id === r.id && "bg-accent/40"
                        )}
                      >
                        <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {weekLabel(r)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono font-semibold">
                          {r.leads.toLocaleString("en-US")}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {r.closes !== null
                            ? r.closes.toLocaleString("en-US")
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {/* What one closed deal was worth this week. */}
                          {r.revenue !== null && r.closes
                            ? usd(Math.round(r.revenue / r.closes))
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {r.revenue !== null ? (
                            <span className="text-success">{usd(r.revenue)}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {rowRoas !== null ? (
                            <span className="text-orange">
                              {rowRoas.toFixed(2)}x
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
                              isPending
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                            )}
                          >
                            {isPending ? "Pending" : "Completed"}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Completion form for one pending week, with the agency's numbers on top. */
function SubmitResults({
  report,
  outstanding,
  onDone,
}: {
  report: Report;
  outstanding: number;
  onDone: () => void;
}) {
  const [closes, setCloses] = useState("");
  const [revenue, setRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Average ticket implied by what they've typed so far.
  const closesPreview = parseInt(closes, 10);
  const revenuePreview = parseFloat(revenue);
  const ticketPreview =
    Number.isFinite(closesPreview) &&
    closesPreview > 0 &&
    Number.isFinite(revenuePreview) &&
    revenuePreview > 0
      ? Math.round((revenuePreview * 100) / closesPreview)
      : null;

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
    <Beam>
      <form onSubmit={submit} className="rounded-xl border border-border p-5">
        <h2 className="text-[15px] font-bold tracking-tight">Submit Results</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enter your results for {weekLabel(report)}
        </p>
        {outstanding > 1 && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-warning">
            {outstanding} weeks outstanding — pick another from the history.
          </p>
        )}

        {/* What the agency posted for this week */}
        <dl className="mt-4 rounded-lg bg-accent/50 px-4 py-3 text-[13px]">
          <p className="micro-label">Agency Results</p>
          <div className="mt-2 flex justify-between gap-3">
            <dt className="font-medium">Leads Generated</dt>
            <dd className="font-mono font-semibold">
              {report.leads.toLocaleString("en-US")}
            </dd>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <dt className="font-medium">Ad Spend</dt>
            <dd className="font-mono font-semibold">{usd(report.totalSpend)}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <dt className="font-medium">Cost Per Lead</dt>
            <dd className="font-mono font-semibold">{usd(report.cpl)}</dd>
          </div>
        </dl>

        <div className="mt-5 space-y-4">
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold">
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
            <span className="mb-1.5 block text-[13px] font-semibold">
              Total Revenue ($)
            </span>
            <Input
              inputMode="decimal"
              placeholder="e.g. 4500.00"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>

          {ticketPreview !== null && (
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              That&apos;s {usd(ticketPreview)} per client closed
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            <Plus className="mr-1.5 h-4 w-4" />
            {saving ? "Saving…" : "Submit Report"}
          </Button>
        </div>
      </form>
    </Beam>
  );
}
