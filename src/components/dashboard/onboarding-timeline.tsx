"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Check, ExternalLink } from "lucide-react";

/**
 * Onboarding Timeline — the client's view of their own build, step by step.
 * Same checklist the team works from in the Client CRM, read-only here: each
 * step's state is whatever the team last set. Paired with the assets rail so
 * the client can reach their drive folder and landing page from one screen.
 */

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  stage: string | null;
}

interface Onboarding {
  empty?: boolean;
  total: number;
  done: number;
  stageLabel: string;
  stageIndex: number;
  stageTotal: number;
  tasks: Task[];
  assets: {
    driveUrl: string | null;
    landingPageUrl: string | null;
    plan: string | null;
  };
}

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_TONE: Record<Task["status"], string> = {
  pending: "text-muted-foreground",
  in_progress: "text-orange",
  completed: "text-success",
};

export function OnboardingTimeline() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d && !d.error && !d.empty) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // No roster record yet — the team hasn't onboarded them, so there is no
  // timeline to show. The rest of the page still renders.
  if (!data) return null;

  const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
  // The first step the team hasn't finished — what the client is waiting on.
  const nextStep = data.tasks.find((t) => t.status !== "completed");

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_18rem] lg:items-start">
      {/* Timeline */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Onboarding Timeline
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your journey to launching successful campaigns.
            </p>
            {/* Project status = the stage the team has them at in the CRM. */}
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-orange">
              {data.stageLabel}
              <span className="font-normal text-muted-foreground">
                Stage {data.stageIndex} / {data.stageTotal}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight text-orange">
              {pct}%
            </p>
            <p className="micro-label">Completed</p>
          </div>
        </div>

        {/* Progress rail */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-orange"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <motion.ol
          variants={rowCascade}
          initial="hidden"
          animate="visible"
          className="mt-6"
        >
          {data.tasks.map((t, i) => (
            <motion.li
              key={t.id}
              variants={rowItem}
              className="relative flex gap-3 pb-6 last:pb-0"
            >
              {/* Connector — stops at the last step so the line never dangles. */}
              {i < data.tasks.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[9px] top-5 h-full w-px",
                    t.status === "completed" ? "bg-success/40" : "bg-border"
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border bg-background",
                  t.status === "completed"
                    ? "border-success bg-success text-white"
                    : t.status === "in_progress"
                      ? "border-orange"
                      : "border-border"
                )}
              >
                {t.status === "completed" ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : t.status === "in_progress" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-orange" />
                ) : null}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    t.status === "completed" && "text-muted-foreground"
                  )}
                >
                  {t.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-[11px] uppercase tracking-wide",
                    STATUS_TONE[t.status]
                  )}
                >
                  {STATUS_LABEL[t.status]}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* Assets rail */}
      <aside className="rounded-xl border border-border p-5 lg:sticky lg:top-6">
        <h2 className="text-[15px] font-bold tracking-tight">Project Assets</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Quick links to your resources.
        </p>

        <div className="mt-5 space-y-4">
          <AssetLink label="Google Drive Folder" href={data.assets.driveUrl} />
          <AssetLink label="Landing Page" href={data.assets.landingPageUrl} />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="micro-label">Current Plan</p>
          <div className="mt-2 rounded-lg bg-accent px-3 py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-wide text-orange">
            {data.assets.plan ?? "Pending Assignment"}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="micro-label">Up Next</p>
          <p className="mt-1.5 text-sm font-semibold">
            {nextStep
              ? nextStep.title
              : data.total > 0
                ? "Every step is done"
                : "Your checklist is being set up"}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {data.done} of {data.total} steps done
          </p>
        </div>
      </aside>
    </div>
  );
}

/** One asset row — a link once the team has added it, italic note until then. */
function AssetLink({ label, href }: { label: string; href: string | null }) {
  return (
    <div>
      <p className="text-[13px] font-medium">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-orange transition-colors hover:underline"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-0.5 text-[13px] italic text-muted-foreground">
          Not linked yet
        </p>
      )}
    </div>
  );
}
