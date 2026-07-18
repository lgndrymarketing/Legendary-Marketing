"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { PageHero, CountUp } from "@/components/ui/firecrawl";
import { AreaChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Users2, UserX, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";

interface Dashboard {
  activeClients: number;
  pausedCanceled: number;
  highPriorityTaskCount: number;
  months: string[];
  newClientsSeries: number[];
  highPriorityTasks: {
    id: string;
    title: string;
    projectName: string;
    assigneeName: string;
    priority: string;
  }[];
}

/** Hairline-divided 3-up grid cell borders. */
const statCell = (i: number) =>
  cn("px-5 py-6", i > 0 && "border-t border-border sm:border-t-0 sm:border-l");

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => {
        if (res.status === 403) {
          setDenied(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((d) => {
        if (d && !d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Active Clients",
      value: data?.activeClients ?? 0,
      icon: Users2,
      accent: "text-orange",
    },
    {
      label: "Paused / Canceled",
      value: data?.pausedCanceled ?? 0,
      icon: UserX,
      accent: "text-destructive",
    },
    {
      label: "High Priority Tasks",
      value: data?.highPriorityTaskCount ?? 0,
      icon: AlertCircle,
      accent: "text-orange",
    },
  ];

  const xLabels = (data?.months ?? []).map((m) => m);

  return (
    <div className="space-y-8">
      <PageHero
        title="Admin Dashboard"
        description="Overview of your agency's performance and priority tasks."
      />

      {denied ? (
        <EmptyState
          icon={AlertCircle}
          title="Admin overview"
          description="This dashboard is admin-only."
        />
      ) : (
        <>
          {/* Stats — hairline-divided 3-up */}
          <motion.section
            variants={cascade}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 border-b border-border sm:grid-cols-3"
          >
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  variants={cascadeItem}
                  className={statCell(i)}
                >
                  <div className="flex items-center justify-between">
                    <p className="micro-label">{s.label}</p>
                    <Icon className={cn("h-4 w-4", s.accent)} />
                  </div>
                  <p className="mt-2 text-4xl font-bold tracking-tight">
                    {loading ? (
                      <Skeleton className="h-10 w-14" />
                    ) : (
                      <CountUp value={s.value} />
                    )}
                  </p>
                </motion.div>
              );
            })}
          </motion.section>

          {/* New clients chart + high priority tasks */}
          <section className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <TrendingUp className="h-4 w-4 text-orange" />
                <h2 className="text-[15px] font-semibold">
                  New Clients (Last 6 Months)
                </h2>
              </div>
              {loading ? (
                <Skeleton className="mt-6 h-64 w-full" />
              ) : (
                <AreaChart
                  className="mt-6"
                  points={data?.newClientsSeries ?? [0, 0, 0, 0, 0, 0]}
                  xLabels={xLabels}
                  height={260}
                  format={(v) => Math.round(v).toLocaleString("en-US")}
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange" />
                  <h2 className="text-[15px] font-semibold">
                    High Priority Tasks
                  </h2>
                </div>
                <span className="micro-label">Action required</span>
              </div>

              {loading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data || data.highPriorityTasks.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  No high-priority tasks right now.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.highPriorityTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {t.title}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {t.projectName} · {t.assigneeName}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wide text-destructive">
                        High
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/admin/campaigns"
                className="group mt-5 inline-flex items-center gap-1 text-sm font-medium text-orange hover:underline"
              >
                View all campaigns
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
