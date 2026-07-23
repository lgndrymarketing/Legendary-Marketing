/**
 * The agency partnership for ledger math and payment attribution.
 *
 * Partners are Uri and Duke — matched by first name (in that order) among
 * admin accounts. Other admins keep full admin access but are never offered
 * as a payment receiver or counted in the partner ledger. If either name is
 * missing the first two admins by creation stand in so the ledger never
 * goes blank.
 *
 * Production accounts (as of Jul 2026):
 *   Uri  → uriiconsulting@gmail.com  (admin, firstName "Uri")
 *   Duke → lgndryscales@gmail.com    (admin, firstName "Duke")
 *   mosninco@gmail.com is the developer's admin account — full access,
 *   deliberately NOT a ledger partner. Matching is by first name, so keep
 *   those names set on the right accounts (Admin → Team).
 */

export const PARTNER_NAMES = ["uri", "duke"] as const;

export function pickPartners<T extends { firstName: string | null }>(
  admins: T[]
): T[] {
  const named = PARTNER_NAMES.map((n) =>
    admins.find((a) => (a.firstName ?? "").toLowerCase() === n)
  );
  return named[0] && named[1] ? (named as T[]) : admins.slice(0, 2);
}
