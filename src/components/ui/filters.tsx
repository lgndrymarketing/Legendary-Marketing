"use client";

/**
 * Filter-row primitives (design.md §1.3): pill search field, icon dropdown
 * pills, and a calendar date-range pill that opens a full picker popover —
 * preset rail on the left, dual-month range calendar on the right, with
 * Clear / Apply actions. Shared by the admin finance pages.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Search,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const pillClass =
  "h-9 rounded-full border border-border bg-background text-sm outline-none transition-colors focus:border-orange";

export function SearchPill({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        className={cn(pillClass, "w-full pl-9 pr-3 placeholder:text-muted-foreground")}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectPill({
  value,
  onChange,
  options,
  icon: Icon,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: LucideIcon;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <select
        className={cn(pillClass, "w-full appearance-none pr-8", Icon ? "pl-9" : "pl-3")}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </div>
  );
}

export function SortPill(props: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return <SelectPill {...props} icon={ArrowUpDown} ariaLabel="Sort by" />;
}

/* ---------------------------------------------------------------- dates -- */

export interface DateRange {
  preset: string;
  /** yyyy-mm-dd, only meaningful when preset === "custom" */
  from: string;
  to: string;
}

export const ALL_TIME: DateRange = { preset: "all", from: "", to: "" };

export const DATE_PRESETS: { value: string; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3m", label: "Last 3 months" },
  { value: "last_6m", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
];

/** Resolve a DateRange to concrete bounds. `to` is exclusive. */
export function rangeBounds(range: DateRange): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  const dayStart = (offsetDays: number) =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - offsetDays
      )
    );
  const monthStart = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  switch (range.preset) {
    case "today":
      return { from: dayStart(0), to: null };
    case "last_7":
      return { from: dayStart(7), to: null };
    case "last_30":
      return { from: dayStart(30), to: null };
    case "this_month":
      return { from: monthStart(0), to: null };
    case "last_month":
      return { from: monthStart(1), to: monthStart(0) };
    case "last_3m":
      return { from: monthStart(2), to: null };
    case "last_6m":
      return { from: monthStart(5), to: null };
    case "this_year":
      return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to: null };
    case "custom": {
      const from = range.from ? new Date(range.from + "T00:00:00Z") : null;
      // Exclusive upper bound: the day after the picked end date.
      const to = range.to
        ? new Date(new Date(range.to + "T00:00:00Z").getTime() + 86_400_000)
        : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

/** True when `date` (ISO string) falls inside the range. */
export function inRange(date: string, range: DateRange): boolean {
  const { from, to } = rangeBounds(range);
  const d = new Date(date);
  if (from && d < from) return false;
  if (to && d >= to) return false;
  return true;
}

const fmtDay = (s: string) =>
  s
    ? new Date(s + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "…";

/** Short human label for the active range (trigger pill, chart captions). */
export function rangeLabel(range: DateRange): string {
  if (range.preset === "custom") {
    if (range.from && range.from === range.to) return fmtDay(range.from);
    return `${fmtDay(range.from)} – ${fmtDay(range.to)}`;
  }
  return DATE_PRESETS.find((p) => p.value === range.preset)?.label ?? "All time";
}

/* ------------------------------------------------------- calendar popover -- */

interface Ym {
  y: number;
  m: number; // 0-based
}

const ymAdd = ({ y, m }: Ym, delta: number): Ym => {
  const n = y * 12 + m + delta;
  return { y: Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthTitle = ({ y, m }: Ym) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** 42-cell grid for one month, padded with adjacent-month days. */
function monthCells({ y, m }: Ym) {
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(y, m, 1 + i - firstDow));
    cells.push({
      y: d.getUTCFullYear(),
      m: d.getUTCMonth(),
      d: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m,
    });
  }
  return cells;
}

function MonthGrid({
  ym,
  draft,
  today,
  onPick,
}: {
  ym: Ym;
  draft: DateRange;
  today: string;
  onPick: (day: string) => void;
}) {
  const { from, to } = draft.preset === "custom" ? draft : { from: "", to: "" };
  return (
    <div>
      <p className="pb-3 text-center text-sm font-semibold">{monthTitle(ym)}</p>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="pb-1 font-mono text-[10px] uppercase text-muted-foreground"
          >
            {w}
          </span>
        ))}
        {monthCells(ym).map((c, i) => {
          const day = iso(c.y, c.m, c.d);
          const isFrom = !!from && day === from;
          const isTo = !!to && day === to;
          const between =
            !!from && !!to && day > from && day < to && c.inMonth;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(day)}
              aria-label={fmtDay(day)}
              aria-pressed={isFrom || isTo}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[13px] transition-colors cursor-pointer",
                !c.inMonth && "text-muted-foreground/40",
                c.inMonth && !isFrom && !isTo && "hover:bg-muted",
                between && "bg-accent text-orange",
                (isFrom || isTo) &&
                  "bg-orange font-semibold text-primary-foreground",
                day === today &&
                  !isFrom &&
                  !isTo &&
                  "border border-orange font-semibold"
              )}
            >
              {c.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Trigger pill + full picker popover: preset rail (left), dual-month range
 * calendar (right), Clear / Apply footer. Presets apply instantly; day
 * clicks build a custom range committed with Apply.
 */
export function DateRangePill({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const rootRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [anchor, setAnchor] = useState<Ym>({
    y: now.getFullYear(),
    m: now.getMonth(),
  });

  function openPicker() {
    setDraft(value);
    if (value.preset === "custom" && value.from) {
      const d = new Date(value.from + "T00:00:00Z");
      setAnchor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    } else {
      setAnchor({ y: now.getFullYear(), m: now.getMonth() });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickDay(day: string) {
    setDraft((prev) => {
      const cur = prev.preset === "custom" ? prev : { from: "", to: "" };
      // First click (or a fresh start after a full range) anchors the range;
      // second click completes it, swapping if picked backwards.
      if (!cur.from || (cur.from && cur.to)) {
        return { preset: "custom", from: day, to: "" };
      }
      if (day < cur.from) {
        return { preset: "custom", from: day, to: cur.from };
      }
      return { preset: "custom", from: cur.from, to: day };
    });
  }

  function apply() {
    if (draft.preset === "custom" && draft.from) {
      onChange({ ...draft, to: draft.to || draft.from });
    } else {
      onChange(draft);
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-label="Date range"
        aria-expanded={open}
        className={cn(
          pillClass,
          "flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50",
          value.preset !== "all" && "border-orange/40 bg-accent"
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={cn(value.preset !== "all" && "font-medium")}>
          {rangeLabel(value)}
        </span>
        <svg
          className="h-3 w-3 text-muted-foreground"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-max max-w-[92vw] overflow-auto rounded-2xl border border-border bg-background shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)]"
          >
            <div className="flex">
              {/* Preset rail */}
              <div className="w-40 shrink-0 border-r border-border p-2">
                {DATE_PRESETS.map((p) => {
                  const active = draft.preset === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setDraft({ preset: p.value, from: "", to: "" });
                        onChange({ preset: p.value, from: "", to: "" });
                        setOpen(false);
                      }}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                        active
                          ? "bg-accent font-medium text-orange"
                          : "hover:bg-muted"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Calendars */}
              <div className="p-4">
                <div className="relative flex gap-8">
                  <button
                    type="button"
                    onClick={() => setAnchor((a) => ymAdd(a, -1))}
                    className="absolute left-0 top-0 rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnchor((a) => ymAdd(a, 1))}
                    className="absolute right-0 top-0 rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <MonthGrid
                    ym={anchor}
                    draft={draft}
                    today={today}
                    onPick={pickDay}
                  />
                  <div className="hidden sm:block">
                    <MonthGrid
                      ym={ymAdd(anchor, 1)}
                      draft={draft}
                      today={today}
                      onPick={pickDay}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {draft.preset === "custom" && draft.from
                      ? `${fmtDay(draft.from)} → ${
                          draft.to ? fmtDay(draft.to) : "pick end date"
                        }`
                      : rangeLabel(draft)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDraft(ALL_TIME);
                        onChange(ALL_TIME);
                        setOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button type="button" size="sm" onClick={apply}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
