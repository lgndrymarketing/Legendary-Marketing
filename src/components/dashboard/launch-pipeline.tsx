"use client";

import { useEffect, useState } from "react";
import { BracketLabel } from "@/components/ui/firecrawl";
import { cn } from "@/lib/utils";
import { Check, Circle, Rocket } from "lucide-react";

interface Stage {
  key: string;
  label: string;
  complete: boolean;
  active: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Onboarding {
  stageLabel: string;
  total: number;
  done: number;
  stages: Stage[];
  tasks: Task[];
}

/**
 * Read-only launch pipeline for the client dashboard — the same 12-stage
 * onboarding the team tracks in the Client CRM. Updates as the team completes
 * each step (the transparency bridge). Renders nothing until the client has a
 * roster record.
 */
export function LaunchPipeline() {
  const [data, setData] = useState<Onboarding | null>(null);

  useEffect(() => {
    fetch("/api/client/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d && !d.error && !d.empty) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <section className="animate-fade-up border-b border-border pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Launch Progress</h2>
        </div>
        <BracketLabel n={data.done} m={data.total} label="Steps" />
      </div>

      {/* Progress bar + current stage */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">
            Current stage:{" "}
            <span className="font-semibold text-foreground">
              {data.stageLabel}
            </span>
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {pct}% complete
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-orange transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stage stepper */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.stages.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                s.complete
                  ? "border-success bg-success text-white"
                  : s.active
                    ? "border-orange text-orange"
                    : "border-border text-muted-foreground"
              )}
            >
              {s.complete ? (
                <Check className="h-3 w-3" />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </span>
            <span
              className={cn(
                "text-xs",
                s.complete
                  ? "text-foreground"
                  : s.active
                    ? "font-semibold text-orange"
                    : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
