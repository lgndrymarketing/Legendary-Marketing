"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  PageHero,
  CountUp,
  Sparkline,
  BracketLabel,
} from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem, rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Inbox,
  ArrowRight,
  UserCog,
  Plug,
} from "lucide-react";
import { serviceLabels } from "@/lib/services";
import { AreaChart } from "@/components/ui/charts";

interface AdminStats {
  totalClients: number;
  activeProjects: number;
  totalMessages: number;
  unreadMessages: number;
  totalLeads: number;
  newLeads: number;
  totalRevenue: number;
}

interface Metrics {
  totals: {
    totalRevenue: number;
    totalCosts: number;
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
  };
}

interface ProjectRow {
  id: string;
  name: string;
  serviceType: string;
  status: string;
  currentPhase: number;
  createdAt: string;
}

function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

// Same semantic mapping as the old badge variants, expressed as mono text color.
const statusClass = (status: string): string =>
  status === "completed"
    ? "text-success"
    : status === "payment_pending" || status === "cancelled"
      ? "text-warning"
      : "text-orange";

const quickLinks = [
  { label: "Campaigns", href: "/admin/campaigns", icon: FolderKanban },
  { label: "Leads", href: "/admin/leads", icon: Inbox },
  { label: "Team", href: "/admin/team", icon: UserCog },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
];

/** Hairline-divided 4-up grid cell borders (2-up on small screens). */
const statCell = (i: number) =>
  cn(
    "px-5 py-6",
    i % 2 === 1 && "border-l border-border",
    i >= 2 && "max-lg:border-t max-lg:border-border",
    i > 0 && "lg:border-l lg:border-border"
  );

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  // Agency-wide stats are admin/PM only — a VA gets 403 and sees a scoped
  // overview (their assigned projects) without the revenue/pipeline tiles.
  const [statsDenied, setStatsDenied] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((res) => {
        if (res.status === 403) {
          setStatsDenied(true);
          return null;
        }
        return res.ok ? res.json() : null;
      }),
      fetch("/api/projects").then((res) => (res.ok ? res.json() : [])),
      // Financial command center — admin-only; PMs simply don't get the band.
      fetch("/api/admin/metrics").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([statsData, projectsData, metricsData]) => {
        if (statsData && typeof statsData === "object" && !statsData.error) {
          setStats(statsData);
        }
        if (Array.isArray(projectsData)) setProjects(projectsData);
        if (metricsData && !metricsData.error) setMetrics(metricsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCells: {
    label: string;
    value: number;
    format?: (v: number) => string;
  }[] = stats
    ? [
        { label: "Total Clients", value: stats.totalClients },
        { label: "Active Campaigns", value: stats.activeProjects },
        {
          label: "Recognized Revenue",
          value: stats.totalRevenue,
          format: formatCents,
        },
        { label: "Unread Messages", value: stats.unreadMessages },
      ]
    : [];

  // Decorative 7-point trend, derived deterministically from the live totals.
  const sparkSeed = stats
    ? Math.max(stats.totalLeads + stats.activeProjects + stats.totalClients, 4)
    : 0;
  const sparkPoints = [0.35, 0.52, 0.44, 0.66, 0.58, 0.82, 1].map(
    (f) => Math.round(f * sparkSeed * 10) / 10
  );
  // Axis labels computed once on mount (clock reads are impure during render).
  const [axisLabels] = useState<[string, string]>(() => {
    const fmt = (daysAgo: number) => {
      const d = new Date(Date.now() - daysAgo * 86_400_000);
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
        d.getDate()
      ).padStart(2, "0")}`;
    };
    return [fmt(6), fmt(0)];
  });

  const recentProjects = [...projects]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHero
        title="Agency Dashboard"
        description="Your pulse across clients, campaigns, pipeline, and revenue."
      />

      {/* Financial command center — the agency P&L at a glance (admin only) */}
      {metrics && (
        <motion.section variants={cascade} initial="hidden" animate="visible">
          <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
            {(() => {
              const t = metrics.totals;
              const pct = (f: number) => `${(f * 100).toFixed(1)}%`;
              const tiles: {
                label: string;
                caption: string;
                value: number;
                format: (v: number) => string;
                accent?: string;
              }[] = [
                {
                  label: "Total Revenue",
                  caption: "Setup + monthly fees",
                  value: t.totalRevenue,
                  format: formatCents,
                },
                {
                  label: "Total Costs",
                  caption: "SaaS, team, fees",
                  value: t.totalCosts,
                  format: formatCents,
                  accent: "text-destructive",
                },
                {
                  label: "Profit Margin",
                  caption: `${formatCents(t.totalProfit)} profit`,
                  value: t.profitMargin,
                  format: pct,
                  accent:
                    t.totalProfit >= 0 ? "text-success" : "text-destructive",
                },
                {
                  label: "Total MRR",
                  caption: `ARR: ${formatCents(t.arr)}`,
                  value: t.mrr,
                  format: formatCents,
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
                  format: formatCents,
                },
                {
                  label: "Churn Rate",
                  caption: `${t.clientsLost} client${
                    t.clientsLost === 1 ? "" : "s"
                  } lost`,
                  value: t.churnRate,
                  format: pct,
                  accent: t.churnRate > 0 ? "text-warning" : "text-success",
                },
                {
                  label: "Unread Messages",
                  caption: "Across all campaigns",
                  value: stats?.unreadMessages ?? 0,
                  format: (v) => Math.round(v).toLocaleString("en-US"),
                },
              ];
              return tiles.map((tile, i) => (
                <motion.div
                  key={tile.label}
                  variants={cascadeItem}
                  className={cn(
                    statCell(i),
                    i >= 4 && "lg:border-t lg:border-border"
                  )}
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
              ));
            })()}
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-border py-8 lg:grid-cols-2">
            {(
              [
                { title: "Revenue", series: metrics.series.revenue },
                { title: "Costs", series: metrics.series.costs },
                { title: "Profit", series: metrics.series.profit },
                { title: "MRR Trend", series: metrics.series.mrr },
              ] as const
            ).map((chart) => (
              <div key={chart.title}>
                <div className="flex items-baseline justify-between pb-3">
                  <h3 className="text-[15px] font-semibold">{chart.title}</h3>
                  <Link
                    href="/admin/financials"
                    className="font-mono text-[11px] uppercase text-muted-foreground transition-colors hover:text-orange"
                  >
                    Financials →
                  </Link>
                </div>
                <AreaChart
                  points={[...chart.series]}
                  xLabels={metrics.months.map((m) => m.split(" ")[0])}
                  height={150}
                  format={(v) => formatCents(v)}
                />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Stats — hidden for VAs; superseded by the financial band for admins */}
      {!statsDenied && !metrics && (
        <motion.section variants={cascade} initial="hidden" animate="visible">
          <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
            {loading || !stats
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={cn(statCell(i), "space-y-3")}>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))
              : statCells.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    variants={cascadeItem}
                    className={statCell(i)}
                  >
                    <p className="micro-label">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      <CountUp value={stat.value} format={stat.format} />
                    </p>
                  </motion.div>
                ))}
          </div>

          {/* Lead trend band — decorative series scaled from live totals */}
          {!loading && stats && (
            <motion.div
              variants={cascadeItem}
              className="border-b border-border px-5 py-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold">Lead volume</h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                    Last 7 days
                  </p>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  <CountUp value={stats.totalLeads} />
                </p>
              </div>
              <Sparkline
                points={sparkPoints}
                height={96}
                className="mt-4"
                labels={axisLabels}
              />
            </motion.div>
          )}
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Recent projects */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-[15px] font-semibold">Recent Campaigns</h2>
            <Link
              href="/admin/campaigns"
              className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-orange"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {loading ? (
            <EmptyState icon={FolderKanban} title="Loading campaigns…" description="" />
          ) : recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No campaigns yet"
              description="Client campaigns will appear here once they onboard."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="micro-label py-3 pr-4">Campaign</th>
                    <th className="micro-label py-3 pr-4">Service</th>
                    <th className="micro-label py-3">Status</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={rowCascade}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border"
                >
                  {recentProjects.map((project) => (
                    <motion.tr
                      key={project.id}
                      variants={rowItem}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 font-medium">
                        <Link
                          href={`/admin/campaigns/${project.id}`}
                          className="transition-colors group-hover:text-orange"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {serviceLabels[project.serviceType] ?? project.serviceType}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "font-mono text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
                            statusClass(project.status)
                          )}
                        >
                          {project.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pipeline snapshot + quick actions */}
        <div className="space-y-10">
          {!statsDenied && (
            <section className="border-b border-border pb-8">
              <BracketLabel
                n={loading || !stats ? "—" : stats.newLeads}
                label="NEW LEADS"
              />
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight">
                    {loading || !stats ? "—" : <CountUp value={stats.newLeads} />}
                  </p>
                  <p className="text-sm text-muted-foreground">New leads</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {loading || !stats ? "—" : <CountUp value={stats.totalLeads} />}
                  </p>
                  <p className="text-xs text-muted-foreground">Total captured</p>
                </div>
              </div>
              <Link
                href="/admin/leads"
                className="group mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange hover:underline"
              >
                Triage leads
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </section>
          )}

          <section>
            <p className="micro-label border-b border-border pb-3">
              Quick actions
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(statsDenied
                ? quickLinks.filter((l) => l.href === "/admin/campaigns")
                : quickLinks
              ).map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-sm font-medium transition-colors hover:border-orange/40 hover:bg-orange/5 active:scale-[0.98]"
                  >
                    <Icon className="h-4 w-4 text-orange" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
