import { currentUser } from "@clerk/nextjs/server";
import { AppShell, type ShellNavItem } from "@/components/shell/app-shell";

const navItems: ShellNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Campaigns", href: "/campaigns", icon: "FolderKanban" },
  { label: "Messages", href: "/messages", icon: "MessageSquare" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <AppShell
      navItems={navItems}
      cta={{ label: "New Campaign", href: "/onboarding" }}
      accountEmail={user?.emailAddresses[0]?.emailAddress}
    >
      {children}
    </AppShell>
  );
}
