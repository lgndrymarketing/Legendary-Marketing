"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CountUp } from "@/components/ui/firecrawl";
import { AreaChart } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Summary {
  empty?: boolean;
  totals: {
    totalLeads: number;
    totalSpend: number;
    totalRevenue: number;
    avgCpl: number;
    avgRoas: number;
  };
  weeks: string[];
  series: { leads: number[]; cpl: number[]; roas: number[] };
  hasData: boolean;
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const usdWhole = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const ZERO: Summary = {
  totals: { totalLeads: 0, totalSpend: 0, totalRevenue: 0, avgCpl: 0, avgRoas: 0 },
  weeks: Array.from({ length: 8 }, () => ""),
  series: { leads: Array(8).fill(0), cpl: Array(8).fill(0), roas: Array(8).fill(0) },
  hasData: false,
};

/** Performance Dashboard — leads, CPL, revenue, ROAS with weekly trends.
 * Always visible; zeroes until the agency's tracked metrics start flowing. */
export function PerformanceOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error && !data.empty) setSummary(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-px border-y border-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 px-5 py-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const view = summary ?? ZERO;
  const { totals } = view;
  const tiles = [
    {
      label: "Total Leads",
      value: totals.totalLeads,
      format: (v: number) => Math.round(v).toLocaleString("en-US"),
    },
    {
      label: "Avg Cost Per Lead",
      value: totals.avgCpl,
      format: usd,
    },
    {
      label: "Total Revenue",
      value: totals.totalRevenue,
      format: usdWhole,
      accent: "text-success",
    },
    {
      label: "Avg ROAS",
      value: totals.avgRoas,
      format: (v: number) => `${v.toFixed(2)}×`,
      accent: "text-orange",
    },
  ];

  const charts = [
    {
      title: "Leads Generated",
      caption: "Weekly progression of leads",
      series: view.series.leads,
      format: (v: number) => Math.round(v).toLocaleString("en-US"),
    },
    {
      title: "Cost Per Lead",
      caption: "CPL evolution over time",
      series: view.series.cpl,
      format: usd,
    },
    {
      title: "Return on Ad Spend",
      caption: "Weekly ROAS multiplier",
      series: view.series.roas,
      format: (v: number) => `${v.toFixed(1)}×`,
    },
  ];

  return (
    <motion.section
      variants={cascade}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <div>
        <div className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              variants={cascadeItem}
              className={cn(
                "px-5 py-6",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "max-lg:border-t max-lg:border-border",
                i > 0 && "lg:border-l lg:border-border"
              )}
            >
              <p className="micro-label">{tile.label}</p>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold tracking-tight",
                  "accent" in tile && tile.accent
                )}
              >
                <CountUp value={tile.value} format={tile.format} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {charts.map((chart) => (
          <motion.div key={chart.title} variants={cascadeItem}>
            <div className="border-b border-border pb-3">
              <h3 className="text-[15px] font-semibold">{chart.title}</h3>
              <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                {chart.caption}
              </p>
            </div>
            <AreaChart
              className="mt-5"
              points={chart.series}
              xLabels={view.weeks.map((w, i) =>
                i === 0 || i === view.weeks.length - 1 ? w : ""
              )}
              height={140}
              format={chart.format}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
