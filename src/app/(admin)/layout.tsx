import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminNav } from "@/components/dashboard/admin-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { isStaff, ROLE_LABELS } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || !isStaff(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-semibold hidden sm:inline">Legendary Marketing</span>
              <span className="rounded bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
                {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? "Admin"}
              </span>
            </Link>
            <AdminNav role={user.role} />
          </div>
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationBell />
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
