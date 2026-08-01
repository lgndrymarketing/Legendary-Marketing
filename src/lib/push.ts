/**
 * Push delivery to the iOS/Android shell via Firebase Cloud Messaging.
 *
 * FCM handles both platforms: Android natively, iOS by forwarding to APNs
 * (upload the APNs key in the Firebase console once). We call the HTTP v1
 * API directly with a short-lived OAuth token minted from the service
 * account, so there's no firebase-admin dependency and nothing to run on
 * the edge.
 *
 * Entirely optional: with no credentials configured this no-ops, so the web
 * app and the in-app notification centre work exactly as before. Set
 * FIREBASE_SERVICE_ACCOUNT to the service-account JSON (one line) to switch
 * it on.
 */

interface PushPayload {
  title: string;
  body: string;
  /** In-app path to open when tapped, e.g. "/reports". */
  url?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      return null;
    }
    // Vercel env vars collapse newlines; restore them for the PEM parser.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }
}

const b64url = (input: ArrayBuffer | string) => {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Mint a short-lived access token for the FCM v1 API (RS256 JWT grant). */
async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify(claim)
  )}`;

  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) {
    console.error("FCM token exchange failed:", await res.text());
    return null;
  }
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

/**
 * Send one notification to a set of device tokens. Never throws — callers
 * treat push as a side effect outside their critical path.
 */
export async function sendPush(
  tokens: string[],
  payload: PushPayload
): Promise<void> {
  if (!tokens.length) return;
  const sa = serviceAccount();
  if (!sa) return; // Push not configured — in-app notifications still work.

  const token = await accessToken(sa);
  if (!token) return;

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  // FCM v1 is one-message-per-token; these fan out in parallel and failures
  // are logged rather than surfaced.
  await Promise.allSettled(
    tokens.map(async (deviceToken) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: payload.title, body: payload.body },
            data: payload.url ? { url: payload.url } : undefined,
            apns: {
              payload: { aps: { sound: "default", badge: 1 } },
            },
            android: { notification: { sound: "default" } },
          },
        }),
      });
      if (!res.ok) {
        console.error("FCM send failed:", res.status, await res.text());
      }
    })
  );
}
