"use client";

/**
 * Signature primitives for the orange-on-white dashboard system (design.md).
 * PageHero, StatHeader (count-up numeral), BracketLabel, MetricRing,
 * Sparkline — all pure SVG/motion, no chart deps.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "motion/react";
import { cn } from "@/lib/utils";
import { easeOutExpo } from "@/lib/motion";

/** Oversized page header band with hairline close (Activity-Logs style). */
export function PageHero({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative border-b border-border pb-8", className)}>
      {/* dotted decoration, fades toward the text */}
      <div
        className="dot-texture pointer-events-none absolute inset-y-0 right-0 hidden w-64 sm:block"
        style={{
          maskImage: "linear-gradient(to left, black, transparent)",
          WebkitMaskImage: "linear-gradient(to left, black, transparent)",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06, ease: easeOutExpo }}
              className="mt-2 text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** Animated count-up numeral. `format` receives the eased value. */
export function CountUp({
  value,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  duration = 0.7,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: easeOutExpo,
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only on target change
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/** Title-left / big-numeral-right stat header (Usage-page style). */
export function StatHeader({
  title,
  caption,
  value,
  unit,
  format,
  className,
}: {
  title: string;
  caption?: string;
  value: number;
  unit?: string;
  format?: (v: number) => string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {caption && (
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {caption}
          </p>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight">
        <CountUp value={value} format={format} />
        {unit && (
          <span className="ml-1.5 text-lg font-semibold text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

/** `[ 3 / 5 ] · LABEL` mono micro-header with orange tick. */
export function BracketLabel({
  n,
  m,
  label,
  className,
}: {
  n: number | string;
  m?: number | string;
  label: string;
  className?: string;
}) {
  return (
    <p className={cn("bracket-label flex items-center gap-2", className)}>
      <span className="h-3.5 w-[3px] rounded-full bg-orange" />
      <span>
        [ <b>{n}</b>
        {m !== undefined && <> / {m}</>} ] · {label}
      </span>
    </p>
  );
}

/** Circular progress ring ("0 of 2 active browsers" style). */
export function MetricRing({
  value,
  max,
  size = 56,
  label,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: easeOutExpo }}
        />
        <text
          x="50%"
          y="50%"
          className="rotate-90 fill-foreground font-mono text-sm font-semibold"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ transformOrigin: "center" }}
        >
          {value}
        </text>
      </svg>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

/**
 * Orange area sparkline over a dotted backdrop, with path draw-in.
 * `points` are raw values, evenly spaced.
 */
export function Sparkline({
  points,
  height = 120,
  className,
  labels,
}: {
  points: number[];
  height?: number;
  className?: string;
  /** Optional mono axis labels rendered under the chart (first/last shown). */
  labels?: [string, string];
}) {
  const w = 100;
  const h = 100;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const pts = points.map(
    (p, i) => [i * step, h - ((p - min) / range) * (h - 14) - 6] as const
  );
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className={cn("relative", className)}>
      <div
        className="dot-texture pointer-events-none absolute inset-0 opacity-60"
        style={{
          maskImage: "linear-gradient(to top, transparent, black)",
          WebkitMaskImage: "linear-gradient(to top, transparent, black)",
        }}
      />
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="relative w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id="lm-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-orange)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-orange)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#lm-spark-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        />
        {/* Opacity fade, not a pathLength draw-in — dash-based draw animations
            render with gaps when the viewBox is stretched (preserveAspectRatio
            "none" + non-scaling-stroke). */}
        <motion.path
          d={line}
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        />
      </svg>
      {labels && (
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

/** Weekly/Monthly-style segmented control. */
export function SegmentedTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-[13px] transition-colors cursor-pointer",
              active ? "font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-pill"
                className="absolute inset-0 rounded-md border border-border bg-background shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
