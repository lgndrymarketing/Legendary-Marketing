import * as Ably from "ably";

/**
 * Server-only Ably REST client, lazily initialized (mirrors the Proxy-based
 * lazy singleton pattern used by `src/db/index.ts`). Never throws at import
 * time — only when actually used without ABLY_API_KEY configured, so pages
 * and routes that don't touch Ably keep working with no env vars set.
 */

let _ably: Ably.Rest | null = null;

function createAblyRest(): Ably.Rest {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ABLY_API_KEY environment variable is not set. Real-time messaging is disabled."
    );
  }
  return new Ably.Rest({ key: apiKey });
}

export const getAblyRest = (): Ably.Rest => {
  if (!_ably) {
    _ably = createAblyRest();
  }
  return _ably;
};

export function isAblyConfigured(): boolean {
  return Boolean(process.env.ABLY_API_KEY);
}

/**
 * Build a token request scoped to a single channel, SUBSCRIBE-ONLY.
 *
 * Clients must never publish directly: message rows are the source of truth
 * and the server broadcasts them via publishToChannel() after persisting +
 * assigning the trusted role. Granting "publish" here would let a client
 * inject a forged message object (e.g. role:"admin") straight to the socket,
 * which every subscriber would render as a genuine agency message. So the
 * token only permits "subscribe" + "presence".
 */
export async function createTokenRequest(
  clientId: string,
  channel: string
): Promise<Ably.TokenRequest> {
  const rest = getAblyRest();
  return rest.auth.createTokenRequest({
    clientId,
    capability: {
      [channel]: ["subscribe", "presence"],
    },
  });
}

/**
 * Publish a message to a channel via the REST client. Callers should wrap
 * this in try/catch — an Ably outage or missing config should never break
 * the underlying feature (e.g. sending a chat message).
 */
export async function publishToChannel(
  channel: string,
  eventName: string,
  data: unknown
): Promise<void> {
  const rest = getAblyRest();
  await rest.channels.get(channel).publish(eventName, data);
}
