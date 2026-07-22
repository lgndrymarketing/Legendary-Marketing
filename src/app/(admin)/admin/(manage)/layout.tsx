import { assertAdminPage } from "@/lib/admin-page-guard";

/**
 * Admin-only guard for the manage surfaces (Team roles, Integration secrets).
 * The `(manage)` route group keeps the URLs unchanged.
 */
export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminPage();
  return <>{children}</>;
}
