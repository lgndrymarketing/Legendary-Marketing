import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell, type ShellNavItem } from "@/components/shell/app-shell";
import {
  isStaff,
  canManageAgency,
  canViewAllProjects,
  ROLE_LABELS,
} from "@/lib/permissions";

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

  // Same role gating as before, expressed as serializable nav config for the
  // client shell (icon = lucide name).
  const navItems: ShellNavItem[] = [
    {
      label: "Overview",
      href: "/admin",
      icon: "LayoutDashboard",
      exact: true,
      section: "Operations",
    },
    ...(canViewAllProjects(user.role)
      ? [
          {
            label: "Clients",
            href: "/admin/clients",
            icon: "Users",
            section: "Operations",
          },
        ]
      : []),
    {
      label: "Campaigns",
      href: "/admin/campaigns",
      icon: "FolderKanban",
      section: "Operations",
    },
    {
      label: "Messages",
      href: "/admin/messages",
      icon: "MessageSquare",
      section: "Operations",
    },
    ...(canManageAgency(user.role)
      ? [
          {
            label: "Financials",
            href: "/admin/financials",
            icon: "BarChart3",
            section: "Finance",
          },
          {
            label: "Clients & Payments",
            href: "/admin/payments",
            icon: "CreditCard",
            section: "Finance",
          },
          {
            label: "Expenses",
            href: "/admin/expenses",
            icon: "Receipt",
            section: "Finance",
          },
          {
            label: "Partner Ledger",
            href: "/admin/ledger",
            icon: "HandCoins",
            section: "Finance",
          },
          {
            label: "Team",
            href: "/admin/team",
            icon: "UserCog",
            section: "Manage",
          },
          {
            label: "Integrations",
            href: "/admin/integrations",
            icon: "Plug",
            section: "Manage",
          },
        ]
      : []),
  ];

  return (
    <AppShell
      navItems={navItems}
      roleLabel={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? "Staff"}
      accountEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
