import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminNav } from "@/components/dashboard/admin-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-charcoal-dark dark:bg-charcoal-dark">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjGFyH-zcjRU7dd9BCXlkr1NYW1kpfyk6MNqM2rtCfSzimgb7leI0M3q-2DmYwthY3Bkpae0RBGILsjuX8cRT1_MKqU0pR1UWGWNoMWesQQfcvBGkfWLky2n5bv8Pt_okFaZcFeHFLXb5jZzwjMpLS5TJohoHx-R8j-WyXCcm1TK5YQpWLHvYoUFP-BOpGL/s320/Age%20(4).png"
                alt="Fortitudo"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="font-bold hidden sm:inline">Fortitudo</span>
              <span className="rounded bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
                Admin
              </span>
            </Link>
            <AdminNav />
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
