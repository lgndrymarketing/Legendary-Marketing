"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CountUp, Sparkline } from "@/components/ui/firecrawl";

interface AnalyticsEvent {
  id: string;
  event: string;
  value: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AnalyticsOverviewProps {
  projectId: string;
}

export function AnalyticsOverview({ projectId }: AnalyticsOverviewProps) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border">
        <EmptyState
          icon={BarChart3}
          title="Loading analytics..."
          description=""
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border">
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Once your campaign is live and tracking events, metrics will appear here."
        />
      </div>
    );
  }

  // Aggregate events by type
  const eventCounts = events.reduce<Record<string, { count: number; totalValue: number }>>((acc, e) => {
    if (!acc[e.event]) acc[e.event] = { count: 0, totalValue: 0 };
    acc[e.event].count++;
    acc[e.event].totalValue += e.value || 0;
    return acc;
  }, {});

  const sortedEvents = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b.count - a.count);

  const maxCount = sortedEvents[0]?.[1].count || 1;

  // Recent events (last 10)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Daily event counts, oldest → newest — a real numeric series drawn from
  // the same fetched data (presentation only).
  const byDay = new Map<string, number>();
  [...events]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((e) => {
      const key = new Date(e.createdAt).toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    });
  const dayKeys = [...byDay.keys()];
  const series = [...byDay.values()];
  const formatDay = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });

  const totalValue = events.reduce((sum, e) => sum + (e.value || 0), 0);

  const stats = [
    { label: "Total Events", value: events.length },
    { label: "Event Types", value: sortedEvents.length },
    { label: "Total Value", value: totalValue },
  ];

  return (
    <div className="space-y-8">
      {/* Summary metrics — hairline-divided 3-up with count-up numerals */}
      <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.label} className="py-5 sm:px-6 sm:first:pl-0">
            <p className="text-3xl font-bold tracking-tight">
              <CountUp value={stat.value} />
            </p>
            <p className="micro-label mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Events over time — only when there's a real multi-point series */}
      {series.length >= 2 && (
        <section className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-semibold">Events over time</h3>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {formatDay(dayKeys[0])} — {formatDay(dayKeys[dayKeys.length - 1])}
              </p>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              <CountUp value={events.length} />
              <span className="ml-1.5 text-lg font-semibold text-muted-foreground">
                events
              </span>
            </p>
          </div>
          <Sparkline
            points={series}
            height={120}
            className="mt-4"
            labels={[formatDay(dayKeys[0]), formatDay(dayKeys[dayKeys.length - 1])]}
          />
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Event breakdown */}
        <section>
          <h3 className="micro-label">Event Breakdown</h3>
          <div className="mt-4 space-y-3">
            {sortedEvents.slice(0, 8).map(([event, data]) => (
              <div key={event}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono text-muted-foreground truncate">{event}</span>
                  <span className="font-mono font-medium">{data.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange transition-all"
                    style={{ width: `${(data.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent events */}
        <section>
          <h3 className="micro-label">Recent Events</h3>
          <div className="mt-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{event.event}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {event.value !== null && (
                  <span className="font-mono text-sm font-semibold text-orange">
                    {event.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
