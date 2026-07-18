import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * The public marketing site is gone — lgndrymarketing.app is portal-only.
 * Logged-out visitors land on sign-in; signed-in users get routed to their
 * role's home via /post-login.
 */
export default async function Home() {
  const { userId } = await auth();
  redirect(userId ? "/post-login" : "/sign-in");
}
