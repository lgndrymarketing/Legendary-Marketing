"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, CountUp } from "@/components/ui/firecrawl";
import { AreaChart, DonutChart, BarList } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BarChart3, Users2 } from "lucide-react";

interface Metrics {
  totals: {
    totalRevenue: number;
    totalCosts: number;
    monthlyRecurringCosts: number;
    profitMargin: number;
    totalProfit: number;
    mrr: number;
    arr: number;
    activeClients: number;
    newClientsThisPeriod: number;
    avgLtv: number;
    avgMonthsRetained: number;
    churnRate: number;
    clientsLost: number;
  };
  months: string[];
  series: {
    revenue: number[];
    costs: number[];
    profit: number[];
    mrr: number[];
    arr: number[];
    newClients: number[];
  };
  topCustomers: { name: string; total: number }[];
  packagesDistribution: { label: string; count: number }[];
}

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;
const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

/** Hairline-divided grid cell borders, 2-up small / 4-up large. */
const statCell = (i: number) =>
  cn(
    "px-5 py-6",
    i % 2 === 1 && "border-l border-border",
    i >= 2 && "max-lg:border-t max-lg:border-border",
    i % 4 !== 0 && "lg:border-l lg:border-border",
    i >= 4 && "lg:border-t lg:border-border"
  );

export default function AdminFinancialsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setMetrics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !metrics) {
    return (
      <div className="space-y-10">
        <PageHero
          title="Financials"
          description="Revenue, costs, profit, and growth across the agency."
        />
        <EmptyState
          icon={BarChart3}
          title="Metrics unavailable"
          description="Financial metrics are admin-only. If you should have access, try refreshing."
        />
      </div>
    );
  }

  const t = metrics?.totals;
  const tiles: {
    label: string;
    caption: string;
    value: number;
    format: (v: number) => string;
    accent?: string;
  }[] = t
    ? [
        {
          label: "Total Revenue",
          caption: "Setup + monthly fees",
          value: t.totalRevenue,
          format: usd,
        },
        {
          label: "Total Costs",
          caption: "SaaS, team, fees",
          value: t.totalCosts,
          format: usd,
          accent: "text-destructive",
        },
        {
          label: "Profit Margin",
          caption: `${usd(t.totalProfit)} profit`,
          value: t.profitMargin,
          format: pct,
          accent: t.totalProfit >= 0 ? "text-success" : "text-destructive",
        },
        {
          label: "Total MRR",
          caption: `ARR: ${usd(t.arr)}`,
          value: t.mrr,
          format: usd,
          accent: "text-orange",
        },
        {
          label: "Active Clients",
          caption: `+${t.newClientsThisPeriod} new this period`,
          value: t.activeClients,
          format: (v) => Math.round(v).toLocaleString("en-US"),
        },
        {
          label: "Avg LTV",
          caption: `~${t.avgMonthsRetained.toFixed(1)} months avg stay`,
          value: t.avgLtv,
          format: usd,
        },
        {
          label: "Churn Rate",
          caption: `${t.clientsLost} client${t.clientsLost === 1 ? "" : "s"} lost`,
          value: t.churnRate,
          format: pct,
          accent: t.churnRate > 0 ? "text-warning" : "text-success",
        },
        {
          label: "Monthly Burn",
          caption: "Recurring costs",
          value: t.monthlyRecurringCosts,
          format: usd,
        },
      ]
    : [];

  const charts: { title: string; series: number[]; money?: boolean }[] =
    metrics
      ? [
          { title: "Revenue", series: metrics.series.revenue, money: true },
          { title: "Costs", series: metrics.series.costs, money: true },
          { title: "Profit", series: metrics.series.profit, money: true },
          { title: "MRR Trend", series: metrics.series.mrr, money: true },
          { title: "ARR Trend", series: metrics.series.arr, money: true },
          { title: "New Clients Trend", series: metrics.series.newClients },
        ]
      : [];

  return (
    <div className="space-y-10">
      <PageHero
        title="Financials"
        description="Revenue, costs, profit, and growth across the agency."
      />

      {/* Headline metrics — hairline-divided 4-up grid */}
      <motion.section variants={cascade} initial="hidden" animate="visible">
        <div className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
          {loading || !t
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cn(statCell(i), "space-y-3")}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            : tiles.map((tile, i) => (
                <motion.div
                  key={tile.label}
                  variants={cascadeItem}
                  className={statCell(i)}
                >
                  <p className="micro-label">{tile.label}</p>
                  <p
                    className={cn(
                      "mt-2 text-3xl font-bold tracking-tight",
                      tile.accent
                    )}
                  >
                    <CountUp value={tile.value} format={tile.format} />
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {tile.caption}
                  </p>
                </motion.div>
              ))}
        </div>
      </motion.section>

      {/* Trend charts — 2-up grid */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {loading || !metrics
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))
          : charts.map((chart) => (
              <div key={chart.title}>
                <div className="flex items-baseline justify-between border-b border-border pb-3">
                  <h2 className="text-[15px] font-semibold">{chart.title}</h2>
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">
                    Last 6 months
                  </p>
                </div>
                <AreaChart
                  className="mt-5"
                  points={chart.series}
                  xLabels={metrics.months.map((m) => m.split(" ")[0])}
                  height={170}
                  format={
                    chart.money
                      ? (v) => usd(v)
                      : (v) => Math.round(v).toLocaleString("en-US")
                  }
                />
              </div>
            ))}
      </section>

      {/* Top customers + packages */}
      {!loading && metrics && (
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Users2 className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">
                Top Customers by Spend
              </h2>
            </div>
            {metrics.topCustomers.length === 0 ? (
              <p className="pt-6 text-center text-sm text-muted-foreground">
                No payment data available.
              </p>
            ) : (
              <BarList
                className="mt-6"
                items={metrics.topCustomers}
                format={usd}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <BarChart3 className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">
                Packages Distribution
              </h2>
            </div>
            {metrics.packagesDistribution.length === 0 ? (
              <p className="pt-6 text-center text-sm text-muted-foreground">
                No active projects yet.
              </p>
            ) : (
              <DonutChart
                className="mt-6"
                data={metrics.packagesDistribution}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
