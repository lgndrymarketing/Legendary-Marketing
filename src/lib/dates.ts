/**
 * Month arithmetic that doesn't overflow short months.
 *
 * `setUTCMonth(m + 1)` on Jan 31 produces "Feb 31" → Mar 3, silently skipping
 * February. Billing dates must clamp to the last day of the target month
 * instead (Jan 31 → Feb 28/29).
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const lastDayOfTarget = new Date(Date.UTC(y, m + months + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      y,
      m + months,
      Math.min(d, lastDayOfTarget),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    )
  );
}
