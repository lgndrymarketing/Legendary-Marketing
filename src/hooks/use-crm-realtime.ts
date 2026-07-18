"use client";

import { useEffect, useRef } from "react";
import * as Ably from "ably";

/**
 * Subscribes the Client CRM to the shared `admin:crm` Ably channel and calls
 * `onUpdate` whenever any team member changes a client, stage, or task — so
 * the board/list stays live across the team on top of the REST source of
 * truth. Best-effort: if Ably isn't configured it simply never fires.
 */
export function useCrmRealtime(onUpdate: () => void) {
  const cb = useRef(onUpdate);
  useEffect(() => {
    cb.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let cancelled = false;
    const client = new Ably.Realtime({
      authCallback: async (_params, callback) => {
        try {
          const res = await fetch("/api/ably/crm-token", { method: "POST" });
          if (!res.ok) {
            callback(`Ably auth failed: ${res.status}`, null);
            return;
          }
          callback(null, await res.json());
        } catch (err) {
          callback(err instanceof Error ? err.message : "Ably auth failed", null);
        }
      },
    });

    const channel = client.channels.get("admin:crm");
    const listener = () => {
      if (!cancelled) cb.current();
    };
    channel.subscribe("update", listener).catch(() => {});

    return () => {
      cancelled = true;
      channel.unsubscribe("update", listener);
      client.close();
    };
  }, []);
}
