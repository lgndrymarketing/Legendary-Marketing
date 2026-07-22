import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/permissions";

/**
 * Admin-only guard for the finance surfaces (Financials, Clients & Payments,
 * Expenses, Partner Ledger). The parent (admin) layout admits all staff so
 * PMs/VAs can reach the operational pages; these routes are agency P&L and
 * partner splits, so they redirect any non-admin to the admin overview even
 * on direct URL access. The `(finance)` route group keeps the URLs unchanged.
 */
export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || !isAdmin(user.role)) redirect("/admin");

  return <>{children}</>;
}
