import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/permissions";

/**
 * Server-side admin-only guard for a route-group layout. The parent (admin)
 * layout admits all staff so PMs/VAs can reach the operational pages; the
 * admin-only surfaces (agency P&L, partner splits, team roles, integration
 * secrets) call this to redirect any non-admin to the admin overview — even
 * on direct URL access. Route groups keep the URLs unchanged.
 */
export async function assertAdminPage(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || !isAdmin(user.role)) redirect("/admin");
}
