"use client";

/**
 * Financial chart primitives for the orange-on-white system (design.md).
 * AreaChart (axis-labeled Sparkline sibling), DonutChart, BarList — pure
 * SVG + motion, no chart deps, mono micro-labels throughout.
 */

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { easeOutExpo } from "@/lib/motion";

/** Orange area chart with y-axis ticks and per-point x labels. */
export function AreaChart({
  points,
  xLabels,
  height = 180,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  className,
}: {
  points: number[];
  /** One label per point; rendered under the plot. */
  xLabels: string[];
  height?: number;
  /** Formats y-axis tick values. */
  format?: (v: number) => string;
  className?: string;
}) {
  const gradId = useId();
  const w = 100;
  const h = 100;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const pts = points.map(
    (p, i) => [i * step, h - (p / max) * (h - 12) - 4] as const
  );
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <div className={cn("flex gap-3", className)}>
      {/* y-axis */}
      <div
        className="flex flex-col justify-between text-right font-mono text-[10px] text-muted-foreground"
        style={{ height }}
      >
        {[...ticks].reverse().map((t, i) => (
          <span key={i}>{format(t)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {/* dotted grid rows */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((_, i) => (
              <div key={i} className="border-t border-dashed border-border/70" />
            ))}
          </div>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="relative h-full w-full"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-orange)"
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-orange)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <motion.path
              d={area}
              fill={`url(#${gradId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke="var(--color-orange)"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: easeOutExpo }}
            />
          </svg>
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
          {xLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Donut with center total and mono legend. Slices cycle brand oranges. */
const DONUT_COLORS = [
  "var(--color-orange)",
  "#FFB347",
  "#C2410C",
  "#FDBA74",
  "#7C2D12",
];

export function DonutChart({
  data,
  size = 168,
  className,
}: {
  data: { label: string; count: number }[];
  size?: number;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const fracs = data.map((d) => (total > 0 ? d.count / total : 0));
  const slices = data.map((d, i) => ({
    ...d,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    dash: fracs[i] * c,
    offset: fracs.slice(0, i).reduce((s, f) => s + f, 0) * c,
  }));

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          {slices.map((s) => (
            <motion.circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${c - s.dash}`}
              initial={{ strokeDashoffset: -s.offset + c * 0.12, opacity: 0 }}
              animate={{ strokeDashoffset: -s.offset, opacity: 1 }}
              transition={{ duration: 0.7, ease: easeOutExpo }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight">{total}</span>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            Active
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {slices.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: s.color }}
            />
            {s.label} · {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal bars ("Top customers by spend"). */
export function BarList({
  items,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  className,
}: {
  items: { name: string; total: number }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.total), 1);
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, i) => (
        <div key={`${item.name}-${i}`}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate font-medium">{item.name}</span>
            </span>
            <span className="shrink-0 font-mono font-semibold">
              {format(item.total)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-orange"
              initial={{ width: 0 }}
              animate={{ width: `${(item.total / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: easeOutExpo }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
