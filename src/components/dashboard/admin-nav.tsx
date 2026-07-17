"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CreditCard,
  MessageSquare,
  UserCog,
  Plug,
  Inbox,
} from "lucide-react";
import {
  canManageAgency,
  canManageLeads,
  canViewAllProjects,
} from "@/lib/permissions";

// `show` decides visibility by role. Overview/Projects/Messages are visible to
// all staff (VAs see a scoped subset inside those pages); Clients/Leads are
// admin+PM; Payments/Team/Integrations are admin-only.
const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, show: () => true },
  { label: "Clients", href: "/admin/clients", icon: Users, show: canViewAllProjects },
  { label: "Leads", href: "/admin/leads", icon: Inbox, show: canManageLeads },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban, show: () => true },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare, show: () => true },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, show: canManageAgency },
  { label: "Team", href: "/admin/team", icon: UserCog, show: canManageAgency },
  { label: "Integrations", href: "/admin/integrations", icon: Plug, show: canManageAgency },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.show(role));

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-orange/10 text-orange font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
