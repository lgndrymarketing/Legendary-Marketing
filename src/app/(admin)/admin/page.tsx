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

/** Card shell — floating white surface with the house shadow. */
function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_12px_32px_-16px_rgba(15,16,16,0.18)]",
        className
      )}
    >
      {children}
    </div>
  );
}

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
          {/* Stat cards */}
          <motion.section
            variants={cascade}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} variants={cascadeItem}>
                  <Card>
                    <div className="flex items-start justify-between">
                      <p className="text-[15px] font-medium text-muted-foreground">
                        {s.label}
                      </p>
                      <Icon className={cn("h-5 w-5", s.accent)} />
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight">
                      {loading ? (
                        <Skeleton className="h-10 w-14" />
                      ) : (
                        <CountUp value={s.value} />
                      )}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </motion.section>

          {/* New clients chart + high priority tasks */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange" />
                <h2 className="text-xl font-bold tracking-tight">
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
            </Card>

            <Card>
              <h2 className="text-xl font-bold tracking-tight">
                High Priority Tasks
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Action required
              </p>

              {loading ? (
                <div className="mt-6 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data || data.highPriorityTasks.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  No high-priority tasks right now.
                </p>
              ) : (
                <ul className="mt-5 divide-y divide-border">
                  {data.highPriorityTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">
                          {t.title}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {t.projectName} · {t.assigneeName}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
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
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
