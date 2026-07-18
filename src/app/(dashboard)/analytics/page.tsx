"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, CountUp } from "@/components/ui/firecrawl";
import { AreaChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cascade, cascadeItem, rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BarChart3, Megaphone } from "lucide-react";

interface CampaignRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  monthlyBudget: number | null;
  totalSpend: number;
  leadsGenerated: number;
  cpl: number;
}

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
  series: {
    leads: number[];
    cpl: number[];
    roas: number[];
    spend: number[];
    revenue: number[];
  };
  campaigns: CampaignRow[];
  hasData: boolean;
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const usdWhole = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const platformLabels: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  other: "Other",
};

const statusClass = (s: string) =>
  s === "active"
    ? "text-success"
    : s === "paused"
    ? "text-warning"
    : "text-muted-foreground";

const ZERO: Summary = {
  totals: {
    totalLeads: 0,
    totalSpend: 0,
    totalRevenue: 0,
    avgCpl: 0,
    avgRoas: 0,
  },
  weeks: Array.from({ length: 8 }, () => ""),
  series: {
    leads: Array(8).fill(0),
    cpl: Array(8).fill(0),
    roas: Array(8).fill(0),
    spend: Array(8).fill(0),
    revenue: Array(8).fill(0),
  },
  campaigns: [],
  hasData: false,
};

/** Deep-dive analytics — the dashboard's performance metrics plus ad spend,
 * tracked revenue, and a per-ad-campaign breakdown. */
export default function AnalyticsPage() {
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

  const view = summary ?? ZERO;
  const { totals } = view;

  const tiles = [
    {
      label: "Total Leads",
      value: totals.totalLeads,
      format: (v: number) => Math.round(v).toLocaleString("en-US"),
    },
    { label: "Avg Cost Per Lead", value: totals.avgCpl, format: usd },
    {
      label: "Total Ad Spend",
      value: totals.totalSpend,
      format: usdWhole,
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
    {
      label: "Ad Campaigns",
      value: view.campaigns.length,
      format: (v: number) => Math.round(v).toLocaleString("en-US"),
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
    {
      title: "Ad Spend",
      caption: "Weekly spend across platforms",
      series: view.series.spend,
      format: usdWhole,
    },
    {
      title: "Revenue",
      caption: "Weekly attributed revenue",
      series: view.series.revenue,
      format: usdWhole,
    },
  ];

  const xLabels = view.weeks.map((w, i) =>
    i === 0 || i === view.weeks.length - 1 ? w : ""
  );

  return (
    <div className="space-y-10">
      <PageHero
        title="Analytics"
        description="The full picture — every performance metric behind your campaigns."
      />

      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-px border-y border-border lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 px-5 py-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={4} />
        </>
      ) : (
        <>
          {/* Metric tiles — hairline-divided grid */}
          <motion.section
            variants={cascade}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 border-y border-border lg:grid-cols-3"
          >
            {tiles.map((tile, i) => (
              <motion.div
                key={tile.label}
                variants={cascadeItem}
                className={cn(
                  "px-5 py-6",
                  i % 2 === 1 && "border-l border-border",
                  i >= 2 && "max-lg:border-t max-lg:border-border",
                  i % 3 !== 0 && "lg:border-l lg:border-border",
                  i >= 3 && "lg:border-t lg:border-border"
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
          </motion.section>

          {/* Trend charts */}
          <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {charts.map((chart) => (
              <div key={chart.title}>
                <div className="border-b border-border pb-3">
                  <h3 className="text-[15px] font-semibold">{chart.title}</h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                    {chart.caption}
                  </p>
                </div>
                <AreaChart
                  className="mt-5"
                  points={chart.series}
                  xLabels={xLabels}
                  height={150}
                  format={chart.format}
                />
              </div>
            ))}
          </section>

          {/* Per-campaign breakdown */}
          <section>
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Megaphone className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">
                Ad Campaign Breakdown
              </h2>
            </div>
            {view.campaigns.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No ad campaigns tracked yet"
                description="Once the team launches your ads, per-campaign spend, leads, and CPL appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="micro-label py-3 pr-4">Campaign</th>
                      <th className="micro-label py-3 pr-4">Platform</th>
                      <th className="micro-label py-3 pr-4">Status</th>
                      <th className="micro-label py-3 pr-4">Budget</th>
                      <th className="micro-label py-3 pr-4">Spend</th>
                      <th className="micro-label py-3 pr-4">Leads</th>
                      <th className="micro-label py-3">CPL</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={rowCascade}
                    initial="hidden"
                    animate="visible"
                    className="divide-y divide-border"
                  >
                    {view.campaigns.map((c) => (
                      <motion.tr
                        key={c.id}
                        variants={rowItem}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="py-3 pr-4 font-medium">{c.name}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">
                            {platformLabels[c.platform] ?? c.platform}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "font-mono text-[11px] font-semibold uppercase tracking-wide",
                              statusClass(c.status)
                            )}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-muted-foreground">
                          {c.monthlyBudget
                            ? `${usdWhole(c.monthlyBudget)}/mo`
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 font-mono font-semibold">
                          {usdWhole(c.totalSpend)}
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {c.leadsGenerated.toLocaleString("en-US")}
                        </td>
                        <td className="py-3 font-mono">
                          {c.cpl > 0 ? usd(c.cpl) : "—"}
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
    </div>
  );
}
