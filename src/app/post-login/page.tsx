import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isStaff } from "@/lib/permissions";

/**
 * Post-login router. Clerk redirects here after sign-in; we resolve the user's
 * role and send them to the right home:
 *   - staff (admin / project_manager / va) → /admin
 *   - client                               → /dashboard
 * A brand-new account whose Clerk→DB sync webhook hasn't landed yet is treated
 * as a client and sent to onboarding.
 */
export default async function PostLoginPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkId, userId));

  if (!user) {
    // DB row not created yet (webhook pending) — new clients start onboarding.
    redirect("/onboarding");
  }

  if (isStaff(user.role)) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
