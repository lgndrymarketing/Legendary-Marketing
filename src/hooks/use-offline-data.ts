"use client";

import { useCallback, useEffect, useState } from "react";
import { cacheSnapshot, readSnapshot, isOnline } from "@/lib/native-offline";

/**
 * Fetch a JSON endpoint, transparently falling back to the last copy cached
 * on the device when the phone has no signal.
 *
 * On the web this is a plain fetch — `readSnapshot`/`cacheSnapshot` no-op
 * off-device, so `stale` is never true and behaviour is unchanged.
 *
 * Returns `stale: true` when the data on screen came from the cache, so the
 * page can say so rather than passing old numbers off as live.
 */
export function useOfflineData<T>(
  key: string,
  url: string
): {
  data: T | null;
  loading: boolean;
  stale: boolean;
  cachedAt: number | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Offline: show the cached copy immediately rather than a dead screen.
      if (!(await isOnline())) {
        const snap = await readSnapshot<T>(key);
        if (!cancelled && snap) {
          setData(snap.data);
          setStale(true);
          setCachedAt(snap.at);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as T;
        if (cancelled) return;
        setData(json);
        setStale(false);
        setCachedAt(null);
        void cacheSnapshot(key, json);
      } catch {
        // Request failed (flaky signal, server hiccup) — fall back rather
        // than showing an empty page.
        const snap = await readSnapshot<T>(key);
        if (!cancelled && snap) {
          setData(snap.data);
          setStale(true);
          setCachedAt(snap.at);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void run();
    return () => {
      cancelled = true;
    };
  }, [key, url, nonce]);

  return { data, loading, stale, cachedAt, reload };
}
