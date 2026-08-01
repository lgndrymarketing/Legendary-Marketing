"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/native";
import { syncReminders } from "@/lib/native-reminders";
import {
  cacheSnapshot,
  isOnline,
  onNetworkChange,
} from "@/lib/native-offline";
import { WifiOff } from "lucide-react";

/**
 * Native-only sync layer for the client portal.
 *
 * On launch (and whenever connectivity returns) it reads the client's own
 * endpoints, caches a snapshot for offline use, and schedules on-device
 * reminders for anything outstanding. Renders an offline banner when the
 * phone drops signal.
 *
 * Renders nothing and performs no work on the web.
 */
export function NativeSync() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    async function sync() {
      if (!(await isOnline())) {
        if (!cancelled) setOffline(true);
        return;
      }
      if (!cancelled) setOffline(false);

      try {
        const [reportsRes, billingRes] = await Promise.all([
          fetch("/api/client/weekly-reports"),
          fetch("/api/client/billing"),
        ]);
        const reports = reportsRes.ok ? await reportsRes.json() : null;
        const billing = billingRes.ok ? await billingRes.json() : null;

        if (cancelled) return;

        // Keep a read-only copy for when the signal drops.
        if (reports) await cacheSnapshot("reports", reports);
        if (billing) await cacheSnapshot("billing", billing);

        const pendingReports = Array.isArray(reports?.reports)
          ? reports.reports.filter(
              (r: { status: string }) => r.status === "pending_client"
            ).length
          : 0;

        await syncReminders({
          pendingReports,
          nextDueDate: billing?.client?.nextDueDate ?? null,
        });
      } catch {
        // Offline or signed out — reminders refresh on the next launch.
      }
    }

    void sync();
    let unsubscribe: (() => void) | undefined;
    void onNetworkChange((online) => {
      setOffline(!online);
      if (online) void sync();
    }).then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-center text-[13px] text-warning">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      You&apos;re offline — showing your last synced numbers.
    </div>
  );
}
