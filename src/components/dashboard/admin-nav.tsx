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
} from "lucide-react";
import { canManageAgency } from "@/lib/permissions";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, adminOnly: false },
  { label: "Clients", href: "/admin/clients", icon: Users, adminOnly: false },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban, adminOnly: false },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare, adminOnly: false },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, adminOnly: true },
  { label: "Team", href: "/admin/team", icon: UserCog, adminOnly: true },
  { label: "Integrations", href: "/admin/integrations", icon: Plug, adminOnly: true },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || canManageAgency(role));

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
