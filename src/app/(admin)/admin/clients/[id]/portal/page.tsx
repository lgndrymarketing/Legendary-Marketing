"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { PageHero, BracketLabel, MetricRing } from "@/components/ui/firecrawl";
import { Beam } from "@/components/ui/beam-focus";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Circle,
  Eye,
  ClipboardCheck,
  ExternalLink,
  FolderKanban,
} from "lucide-react";

interface PortalView {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email: string | null;
    status: string;
    package: string;
    driveUrl: string | null;
    landingPageUrl: string | null;
    hasPortalLogin: boolean;
  };
  pipeline: {
    stageLabel: string;
    total: number;
    done: number;
    stages: { key: string; label: string; complete: boolean; active: boolean }[];
  };
  reports: {
    id: string;
    weekStart: string;
    weekEnd: string;
    leads: number;
    cpl: number;
    totalSpend: number;
    closes: number | null;
    revenue: number | null;
    status: "pending_client" | "completed";
  }[];
  totals: {
    totalLeads: number;
    totalSpend: number;
    totalRevenue: number;
    avgCpl: number;
    roas: number;
    pending: number;
  };
  project: { id: string; name: string; status: string } | null;
  phases: { id: string; name: string; status: string }[];
  campaigns: {
    id: string;
    name: string;
    platform: string;
    status: string;
    leadsGenerated: number;
    totalSpend: number;
  }[];
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
    timeZone: "UTC",
  });

/**
 * View Portal — a read-only mirror of what this client sees in their own
 * portal (launch pipeline, weekly reports and ROAS, project phases, ad
 * campaigns). Admin-only; works before a portal login exists.
 */
export default function ClientPortalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<PortalView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}/portal`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d && !d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHero title="Client Portal" description="Preview unavailable." />
        <EmptyState
          icon={Eye}
          title="Couldn't load this client"
          description="The client may have been removed. Head back to the CRM."
        />
      </div>
    );
  }

  const { client, pipeline, reports, totals, project, phases, campaigns } = data;
  const pct = pipeline.total
    ? Math.round((pipeline.done / pipeline.total) * 100)
    : 0;

  const tiles = [
    { label: "Total Leads", value: totals.totalLeads.toLocaleString("en-US") },
    { label: "Avg CPL", value: usd(totals.avgCpl) },
    { label: "Ad Spend", value: usd(totals.totalSpend) },
    {
      label: "Revenue",
      value: usd(totals.totalRevenue),
      accent: "text-success",
    },
    {
      label: "ROAS",
      value: `${totals.roas.toFixed(2)}x`,
      accent: "text-orange",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/clients"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client CRM
        </Link>
        <PageHero
          title={client.companyName}
          description={`Exactly what ${client.contactName} sees in their portal.`}
          action={
            <div className="flex flex-wrap gap-2">
              {client.driveUrl && (
                <a
                  href={client.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5"
                >
                  <ExternalLink className="h-4 w-4" />
                  Drive
                </a>
              )}
              {client.landingPageUrl && (
                <a
                  href={client.landingPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5"
                >
                  <ExternalLink className="h-4 w-4" />
                  Landing Page
                </a>
              )}
            </div>
          }
        />
      </div>

      {/* Read-only banner — the beam marks this as a live mirror */}
      <Beam>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange/30 bg-accent/40 px-4 py-3">
          <Eye className="h-4 w-4 shrink-0 text-orange" />
          <p className="text-sm">
            <span className="font-semibold">Viewing as client</span> — read-only
            mirror of their portal.
          </p>
          <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {client.hasPortalLogin ? "Portal login active" : "Invite not accepted yet"}
          </span>
        </div>
      </Beam>

      {/* Their performance tiles */}
      <motion.section
        variants={cascade}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-5 sm:divide-x"
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

      {/* Launch pipeline — the same 12 stages they watch */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          <BracketLabel
            n={pipeline.done}
            m={pipeline.total}
            label={`LAUNCH PIPELINE · ${pipeline.stageLabel.toUpperCase()}`}
          />
          <MetricRing
            value={pct}
            max={100}
            size={44}
            label={`${pct}% complete`}
          />
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {pipeline.stages.map((s) => (
            <li key={s.key} className="flex items-center gap-2.5 text-sm">
              {s.complete ? (
                <Check className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle
                  className={cn(
                    "h-4 w-4 shrink-0",
                    s.active ? "text-orange" : "text-muted-foreground/40"
                  )}
                />
              )}
              <span
                className={cn(
                  s.active && "font-semibold text-orange",
                  !s.active && !s.complete && "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Their weekly reports */}
      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ClipboardCheck className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Weekly Reports</h2>
          {totals.pending > 0 && (
            <span className="ml-auto rounded-full bg-warning/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-warning">
              {totals.pending} awaiting them
            </span>
          )}
        </div>
        {reports.length === 0 ? (
          <p className="pt-6 text-sm text-muted-foreground">
            No weekly results posted yet — add them from Data Entry.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Week</th>
                  <th className="micro-label py-3 pr-4 text-right">Leads</th>
                  <th className="micro-label py-3 pr-4 text-right">CPL</th>
                  <th className="micro-label py-3 pr-4 text-right">Spend</th>
                  <th className="micro-label py-3 pr-4 text-right">Revenue</th>
                  <th className="micro-label py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
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
                      {r.revenue !== null ? (
                        <span className="text-success">{usd(r.revenue)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase",
                          r.status === "pending_client"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        )}
                      >
                        {r.status === "pending_client" ? "Needs them" : "Complete"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Project + campaigns, when a portal project exists */}
      {project && (
        <section>
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <FolderKanban className="h-4 w-4 text-orange" />
            <h2 className="text-[15px] font-semibold">{project.name}</h2>
            <Link
              href={`/admin/campaigns/${project.id}`}
              className="ml-auto text-sm text-orange hover:underline"
            >
              Manage →
            </Link>
          </div>
          {phases.length > 0 && (
            <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {phases.map((ph) => (
                <li key={ph.id} className="flex items-center gap-2.5 text-sm">
                  {ph.status === "completed" ? (
                    <Check className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span
                    className={cn(
                      ph.status !== "completed" && "text-muted-foreground"
                    )}
                  >
                    {ph.name}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {campaigns.length > 0 && (
            <div className="mt-6 divide-y divide-border border-t border-border">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 py-3 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground">
                    {c.platform} · {c.status}
                  </span>
                  <span className="ml-auto font-mono">
                    {c.leadsGenerated.toLocaleString("en-US")} leads ·{" "}
                    {usd(c.totalSpend)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
