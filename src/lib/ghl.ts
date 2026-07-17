/**
 * GoHighLevel (GHL) API client.
 *
 * Targets GHL's REST API v2 (https://services.leadconnectorhq.com). This is a
 * scaffold built without live credentials or verified docs access — endpoint
 * paths, payload shapes, and response fields may need adjustment once real
 * GHL_API_KEY / GHL_LOCATION_ID credentials and API docs are available.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export function isGhlConfigured(): boolean {
  return Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

class GhlNotConfiguredError extends Error {
  constructor() {
    super(
      "GoHighLevel is not configured. Set GHL_API_KEY and GHL_LOCATION_ID."
    );
    this.name = "GhlNotConfiguredError";
  }
}

/**
 * Authenticated fetch against the GHL API v2. Throws GhlNotConfiguredError
 * if credentials are missing, so callers can distinguish "not configured"
 * from a genuine API/network failure.
 */
async function ghlFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!isGhlConfigured()) {
    throw new GhlNotConfiguredError();
  }

  const res = await fetch(`${GHL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GHL API request failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`
    );
  }

  return (await res.json()) as T;
}

// Types — shapes are best-effort based on GHL's published v2 API and may
// need adjustment against real responses.

export interface GhlContact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  locationId?: string;
}

export interface GhlOpportunity {
  id: string;
  name: string;
  contactId?: string;
  monetaryValue?: number;
  status?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  updatedAt?: string;
}

export interface SyncContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  companyName?: string | null;
  /** GHL tags, e.g. ["website-lead", "get-started-funnel"] — drive GHL
   * workflows/automations off these. */
  tags?: string[];
  /** Attribution source recorded on the GHL contact. */
  source?: string;
}

export interface CreateOpportunityInput {
  name: string;
  contactId: string;
  monetaryValue?: number;
}

/**
 * Create or update a GHL contact for a client user. GHL's contacts/upsert
 * endpoint creates when no match is found and updates in place otherwise.
 */
export async function syncContactToGhl(
  user: SyncContactInput
): Promise<string> {
  const result = await ghlFetch<{ contact: GhlContact }>(
    "/contacts/upsert",
    {
      method: "POST",
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        phone: user.phone ?? undefined,
        companyName: user.companyName ?? undefined,
        tags: user.tags?.length ? user.tags : undefined,
        source: user.source ?? undefined,
      }),
    }
  );

  return result.contact.id;
}

/**
 * Create a pipeline opportunity in GHL for a project/deal. GHL requires a
 * pipelineId + pipelineStageId in practice — omitted here since we scaffold
 * without a real pipeline configured; wire those in once available.
 */
export async function createGhlOpportunity(
  input: CreateOpportunityInput
): Promise<string> {
  const result = await ghlFetch<{ opportunity: GhlOpportunity }>(
    "/opportunities/",
    {
      method: "POST",
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        name: input.name,
        contactId: input.contactId,
        monetaryValue: input.monetaryValue,
      }),
    }
  );

  return result.opportunity.id;
}

/**
 * List opportunities for the configured location — used for
 * revenue/pipeline reporting and payment sync.
 */
export async function fetchGhlOpportunities(): Promise<GhlOpportunity[]> {
  const result = await ghlFetch<{ opportunities: GhlOpportunity[] }>(
    `/opportunities/search?location_id=${encodeURIComponent(
      process.env.GHL_LOCATION_ID ?? ""
    )}`
  );

  return result.opportunities ?? [];
}

export interface GhlTransaction {
  _id?: string;
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  contactId?: string;
  createdAt?: string;
}

/**
 * List payment transactions recorded in GHL — the agency invoices through
 * GoHighLevel, so this is the revenue feed for the admin billing view.
 */
export async function fetchGhlTransactions(): Promise<GhlTransaction[]> {
  const result = await ghlFetch<{ data: GhlTransaction[] }>(
    `/payments/transactions?altId=${encodeURIComponent(
      process.env.GHL_LOCATION_ID ?? ""
    )}&altType=location`
  );

  return result.data ?? [];
}

export interface GhlAppointment {
  id: string;
  title?: string;
  contactId?: string;
  calendarId?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * List booked appointments for a GHL calendar — surfaces sales calls booked
 * through GHL funnels/calendars inside the agency dashboard.
 */
export async function fetchGhlAppointments(
  calendarId: string,
  startTime: string,
  endTime: string
): Promise<GhlAppointment[]> {
  const params = new URLSearchParams({
    locationId: process.env.GHL_LOCATION_ID ?? "",
    calendarId,
    startTime,
    endTime,
  });
  const result = await ghlFetch<{ events: GhlAppointment[] }>(
    `/calendars/events?${params.toString()}`
  );

  return result.events ?? [];
}
