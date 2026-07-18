"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";

export interface ShellNavItem {
  label: string;
  href: string;
  /** lucide icon name, e.g. "LayoutDashboard" — kept serializable so server
   * layouts can pass nav config into this client shell. */
  icon: string;
  /** Match nested routes too (default true; "/admin" uses exact). */
  exact?: boolean;
}

interface AppShellProps {
  navItems: ShellNavItem[];
  /** Small chip next to the wordmark, e.g. "Admin" / "Project Manager". */
  roleLabel?: string;
  /** Primary CTA in the topbar. */
  cta?: { label: string; href: string };
  /** Account line pinned at the sidebar bottom. */
  accountEmail?: string;
  children: React.ReactNode;
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Circle;
  return <Icon className={className} />;
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: ShellNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
        isActive
          ? "text-orange font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          transition={springSnappy}
          className="absolute inset-0 rounded-lg bg-orange/10"
        />
      )}
      <NavIcon name={item.icon} className="relative h-4 w-4 shrink-0" />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarBody({
  navItems,
  collapsed,
  accountEmail,
  onNavigate,
}: {
  navItems: ShellNavItem[];
  collapsed: boolean;
  accountEmail?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Logo — the mark already carries the LGNDRY wordmark, so no text label. */}
      <Link
        href="/"
        className={cn(
          "flex h-14 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
        onClick={onNavigate}
      >
        <Logo size={collapsed ? 26 : 34} />
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Account */}
      {accountEmail && !collapsed && (
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-xs text-muted-foreground">{accountEmail}</p>
        </div>
      )}
    </>
  );
}

export function AppShell({
  navItems,
  roleLabel,
  cta,
  accountEmail,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — floating white card with a soft shadow */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 244 }}
        transition={springSnappy}
        className="sticky top-3 z-40 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-white shadow-[0_1px_3px_rgba(15,16,16,0.04),0_8px_24px_-12px_rgba(15,16,16,0.12)] lg:ml-3 lg:flex dark:bg-sidebar"
      >
        <SidebarBody
          navItems={navItems}
          collapsed={collapsed}
          accountEmail={accountEmail}
        />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground cursor-pointer"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={springSnappy}
              className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-border bg-sidebar"
            >
              <SidebarBody
                navItems={navItems}
                collapsed={false}
                accountEmail={accountEmail}
                onNavigate={() => setMobileOpen(false)}
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground cursor-pointer"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              {/* Workspace pill — role only; the sidebar already carries the brand */}
              {roleLabel && (
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] bg-orange" />
                  <span className="truncate text-[13px] font-medium">
                    {roleLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <GlobalSearch />
              <NotificationBell />
              <ThemeToggle />
              <UserButton />
              {cta && (
                <Button
                  size="sm"
                  className="ml-1 hidden active:scale-[0.98] sm:inline-flex"
                  asChild
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
