import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell, type ShellNavItem } from "@/components/shell/app-shell";
import {
  isStaff,
  canManageAgency,
  canManageLeads,
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
    { label: "Overview", href: "/admin", icon: "LayoutDashboard", exact: true },
    ...(canViewAllProjects(user.role)
      ? [{ label: "Clients", href: "/admin/clients", icon: "Users" }]
      : []),
    ...(canManageLeads(user.role)
      ? [{ label: "Leads", href: "/admin/leads", icon: "Inbox" }]
      : []),
    { label: "Campaigns", href: "/admin/campaigns", icon: "FolderKanban" },
    { label: "Messages", href: "/admin/messages", icon: "MessageSquare" },
    ...(canManageAgency(user.role)
      ? [
          { label: "Financials", href: "/admin/financials", icon: "BarChart3" },
          { label: "Payments", href: "/admin/payments", icon: "CreditCard" },
          { label: "Expenses", href: "/admin/expenses", icon: "Receipt" },
          { label: "Partner Ledger", href: "/admin/ledger", icon: "HandCoins" },
          { label: "Team", href: "/admin/team", icon: "UserCog" },
          { label: "Integrations", href: "/admin/integrations", icon: "Plug" },
        ]
      : []),
  ];

  return (
    <AppShell
      navItems={navItems}
      roleLabel={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? "Staff"}
      cta={
        canManageLeads(user.role)
          ? { label: "Triage Leads", href: "/admin/leads" }
          : undefined
      }
      accountEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
