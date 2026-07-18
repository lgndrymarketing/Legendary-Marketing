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
  /** Mono micro-label group header; consecutive items sharing a section are
   * rendered under one header ("OPERATIONS", "FINANCE", …). */
  section?: string;
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
        "group/link relative flex items-center rounded-lg text-[13px] transition-colors",
        collapsed ? "h-9 justify-center" : "gap-2.5 px-3 py-2",
        isActive
          ? "font-medium text-orange"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          transition={springSnappy}
          className="absolute inset-0 rounded-lg bg-orange/[0.08]"
        />
      )}
      {/* Orange tick — the system's bracket-label accent, marking the live route. */}
      {isActive && !collapsed && (
        <motion.span
          layoutId="nav-tick"
          transition={springSnappy}
          className="absolute left-0 h-4 w-[3px] rounded-full bg-orange"
        />
      )}
      <NavIcon
        name={item.icon}
        className={cn(
          "relative h-4 w-4 shrink-0 transition-transform duration-200",
          !isActive && "group-hover/link:scale-110"
        )}
      />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
      {isActive && collapsed && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange" />
      )}
    </Link>
  );
}

/** Group consecutive items by their section label. */
function groupNav(navItems: ShellNavItem[]) {
  const groups: { section?: string; items: ShellNavItem[] }[] = [];
  for (const item of navItems) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }
  return groups;
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
  const groups = groupNav(navItems);

  return (
    <>
      {/* Logo band — hairline close with a dot-texture accent fading in from
          the right (PageHero's signature). */}
      <Link
        href="/"
        className={cn(
          "relative flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-5"
        )}
        onClick={onNavigate}
      >
        {!collapsed && (
          <span
            className="dot-texture pointer-events-none absolute inset-y-0 right-0 w-24"
            style={{
              maskImage: "linear-gradient(to left, black, transparent)",
              WebkitMaskImage: "linear-gradient(to left, black, transparent)",
            }}
          />
        )}
        <Logo size={collapsed ? 26 : 36} className="relative" />
      </Link>

      {/* Nav — grouped under mono micro-labels; collapsed mode swaps headers
          for hairline separators. */}
      <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}>
        {groups.map((group, gi) => (
          <div key={group.section ?? gi} className={cn(gi > 0 && "mt-4")}>
            {group.section && !collapsed && (
              <p className="micro-label px-3 pb-1.5">{group.section}</p>
            )}
            {group.section && collapsed && gi > 0 && (
              <span className="mx-auto mb-3 block h-px w-6 bg-border" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Account — orange monogram chip over a hairline, mono email. */}
      {accountEmail && (
        <div
          className={cn(
            "flex shrink-0 items-center border-t border-border",
            collapsed ? "justify-center px-2 py-3" : "gap-2.5 px-4 py-3.5"
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange/10 font-mono text-[11px] font-semibold uppercase text-orange">
            {accountEmail[0]}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="micro-label">Signed in</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {accountEmail}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function AppShell({
  navItems,
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
          className={cn(
            "flex items-center gap-2 border-t border-border py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer",
            collapsed ? "justify-center px-2" : "px-5"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronsLeft className="h-3.5 w-3.5" /> Collapse
            </>
          )}
        </button>
      </motion.aside>

      {/* Mobile navigation — bottom sheet */}
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
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={springSnappy}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) {
                  setMobileOpen(false);
                }
              }}
              className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-border/60 bg-white shadow-[0_-8px_40px_-12px_rgba(15,16,16,0.25)] dark:bg-sidebar"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pb-1 pt-3">
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-2 pt-1">
                <Logo size={30} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav */}
              <nav className="grid grid-cols-2 gap-2 overflow-y-auto p-4">
                {navItems.map((item) => (
                  <SheetNavLink
                    key={item.href}
                    item={item}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </nav>

              {accountEmail && (
                <p className="truncate border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
                  {accountEmail}
                </p>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — borderless; PageHero draws its own hairline */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 sm:px-8 lg:pb-8">
          {children}
        </main>

        {/* Bottom tab bar (mobile) — floating white card, first five destinations */}
        <nav
          className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border/70 bg-white/95 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_10px_28px_-10px_rgba(15,16,16,0.22)] backdrop-blur-xl lg:hidden dark:bg-sidebar/95"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-stretch justify-around">
            {navItems.slice(0, 5).map((item) => (
              <BottomTab key={item.href} item={item} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

/** Bottom-sheet tile — icon + label card, orange when active. */
function SheetNavLink({
  item,
  onNavigate,
}: {
  item: ShellNavItem;
  onNavigate: () => void;
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
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-medium transition-colors",
        isActive
          ? "border-orange/30 bg-orange/10 text-orange"
          : "border-border text-foreground hover:bg-muted/70"
      )}
    >
      <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function BottomTab({ item }: { item: ShellNavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
        isActive ? "text-orange" : "text-muted-foreground"
      )}
    >
      <NavIcon name={item.icon} className="h-5 w-5" />
      <span className="truncate px-1">{item.label}</span>
    </Link>
  );
}
