"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CountUp } from "@/components/ui/firecrawl";
import { AreaChart, LineChart, BarChart } from "@/components/ui/charts";
import { SelectPill } from "@/components/ui/filters";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  CalendarRange,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

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
  /** Weeks the agency has posted that are still waiting on the client. */
  pendingWeeks?: number;
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

/** Windows offered to the client. Value is the `?weeks=` query, "" = all time. */
const RANGES = [
  { value: "", label: "All Time" },
  { value: "4", label: "Last 4 Weeks" },
  { value: "8", label: "Last 8 Weeks" },
  { value: "12", label: "Last 12 Weeks" },
  { value: "26", label: "Last 6 Months" },
  { value: "52", label: "Last Year" },
];

/** Performance Dashboard — leads, CPL, revenue, ROAS with weekly trends,
 * fed by the weekly numbers the agency enters. Always visible; zeroes until
 * the first week is posted. */
export function PerformanceOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("");

  const load = useCallback((weeks: string) => {
    fetch(weeks ? `/api/analytics/summary?weeks=${weeks}` : "/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setSummary(data && !data.error && !data.empty ? data : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const view = summary ?? ZERO;
  const { totals } = view;
  const tiles = [
    {
      label: "Total Leads",
      icon: Users,
      value: totals.totalLeads,
      format: (v: number) => Math.round(v).toLocaleString("en-US"),
    },
    {
      label: "Avg Cost Per Lead",
      icon: Target,
      value: totals.avgCpl,
      format: usd,
    },
    {
      label: "Total Revenue",
      icon: DollarSign,
      value: totals.totalRevenue,
      format: usdWhole,
      accent: "text-success",
    },
    {
      label: "Avg ROAS",
      icon: TrendingUp,
      value: totals.avgRoas,
      format: (v: number) => `${v.toFixed(2)}×`,
      accent: "text-orange",
    },
  ];

  // Only the first and last week are labeled — eight full date ranges under a
  // narrow chart collide into unreadable mush.
  const xLabels = view.weeks.map((w, i) =>
    i === 0 || i === view.weeks.length - 1 ? w : ""
  );

  const charts = [
    {
      title: "Leads Generated",
      caption: "Weekly progression of leads generated",
      render: (
        <AreaChart
          points={view.series.leads}
          xLabels={xLabels}
          height={150}
          format={(v) => Math.round(v).toLocaleString("en-US")}
        />
      ),
    },
    {
      title: "Cost Per Lead (CPL)",
      caption: "Evolution of cost per lead over time",
      render: (
        <LineChart
          points={view.series.cpl}
          xLabels={xLabels}
          height={150}
          format={usd}
        />
      ),
    },
    {
      title: "Return on Ad Spend (ROAS)",
      caption: "Weekly ROAS multiplier",
      render: (
        <BarChart
          points={view.series.roas}
          xLabels={xLabels}
          height={150}
          format={(v) => `${v.toFixed(1)}×`}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 px-5 py-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.section
      variants={cascade}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="micro-label">Performance</p>
        <SelectPill
          className="w-44"
          icon={CalendarRange}
          ariaLabel="Date range"
          value={range}
          onChange={setRange}
          options={RANGES}
        />
      </div>

      {/* Headline metrics — hairline-divided 4-up band */}
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
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
            <div className="flex items-start justify-between gap-2">
              <p className="micro-label">{tile.label}</p>
              <tile.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
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

      {/* Revenue and ROAS lag until the client posts their closes — say so
          rather than letting a zero read as a bad week. */}
      {!!view.pendingWeeks && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Revenue and ROAS exclude {view.pendingWeeks} week
          {view.pendingWeeks === 1 ? "" : "s"} awaiting your closes — add them
          on Weekly Report.
        </p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {charts.map((chart) => (
          <motion.div key={chart.title} variants={cascadeItem}>
            <div className="border-b border-border pb-3">
              <h3 className="text-[15px] font-semibold">{chart.title}</h3>
              <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                {chart.caption}
              </p>
            </div>
            <div className="mt-5">{chart.render}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
