"use client";

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";

const MESSAGE_EVENT = "message";

interface UseAblyChannelResult<T> {
  messages: T[];
  connectionState: Ably.ConnectionState | "disabled";
}

/**
 * Extracts the projectId out of a `project:<id>:messages` channel name so
 * it can be sent to /api/ably/token, which needs it to verify project
 * access and scope the token.
 */
function extractProjectId(channelName: string): string | null {
  const match = channelName.match(/^project:(.+):messages$/);
  return match ? match[1] : null;
}

/**
 * Subscribes to an Ably channel for real-time updates on top of the
 * existing REST API (which remains the source of truth). Lazily creates an
 * Ably.Realtime client authenticated via /api/ably/token, subscribes on
 * mount, and cleans up on unmount or channel change.
 *
 * If Ably isn't configured (no ABLY_API_KEY) or the auth request fails,
 * connectionState will reflect the failure but nothing here throws —
 * callers should treat `messages`/`publish` as a best-effort supplement.
 */
export function useAblyChannel<T = unknown>(
  channelName: string | null
): UseAblyChannelResult<T> {
  const [messages, setMessages] = useState<T[]>([]);
  const [connectionState, setConnectionState] = useState<
    Ably.ConnectionState | "disabled"
  >("disabled");
  useEffect(() => {
    if (!channelName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets connection state when the channel disappears (e.g. project deselected)
      setConnectionState("disabled");
      return;
    }

    const projectId = extractProjectId(channelName);
    let cancelled = false;

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const res = await fetch("/api/ably/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (!res.ok) {
            callback(`Ably auth failed: ${res.status}`, null);
            return;
          }
          const tokenRequest = await res.json();
          callback(null, tokenRequest);
        } catch (err) {
          callback(
            err instanceof Error ? err.message : "Ably auth failed",
            null
          );
        }
      },
    });

    const onConnectionChange = (change: Ably.ConnectionStateChange) => {
      if (!cancelled) setConnectionState(change.current);
    };
    client.connection.on(onConnectionChange);

    const channel = client.channels.get(channelName);

    const listener = (msg: Ably.InboundMessage) => {
      if (!cancelled) setMessages((prev) => [...prev, msg.data as T]);
    };

    channel.subscribe(MESSAGE_EVENT, listener).catch((err) => {
      console.error("Ably channel subscribe failed:", err);
    });

    return () => {
      cancelled = true;
      channel.unsubscribe(MESSAGE_EVENT, listener);
      client.connection.off(onConnectionChange);
      client.close();
      setMessages([]);
    };
  }, [channelName]);

  return { messages, connectionState };
}
