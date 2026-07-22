import { assertAdminPage } from "@/lib/admin-page-guard";

/**
 * Admin-only guard for the finance surfaces (Financials, Clients & Payments,
 * Expenses, Partner Ledger) — agency P&L and partner splits. The `(finance)`
 * route group keeps the URLs unchanged.
 */
export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminPage();
  return <>{children}</>;
}
