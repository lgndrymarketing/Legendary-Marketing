"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderKanban,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Inbox,
  ArrowRight,
  UserCog,
  Plug,
} from "lucide-react";
import { serviceLabels } from "@/lib/services";

interface AdminStats {
  totalClients: number;
  activeProjects: number;
  totalMessages: number;
  unreadMessages: number;
  totalLeads: number;
  newLeads: number;
  totalRevenue: number;
}

interface ProjectRow {
  id: string;
  name: string;
  serviceType: string;
  status: string;
  currentPhase: number;
  createdAt: string;
}

function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

const statusBadgeVariant = (status: string): "success" | "warning" | "orange" =>
  status === "completed"
    ? "success"
    : status === "payment_pending" || status === "cancelled"
      ? "warning"
      : "orange";

const quickLinks = [
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Leads", href: "/admin/leads", icon: Inbox },
  { label: "Team", href: "/admin/team", icon: UserCog },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  // Agency-wide stats are admin/PM only — a VA gets 403 and sees a scoped
  // overview (their assigned projects) without the revenue/pipeline tiles.
  const [statsDenied, setStatsDenied] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((res) => {
        if (res.status === 403) {
          setStatsDenied(true);
          return null;
        }
        return res.ok ? res.json() : null;
      }),
      fetch("/api/projects").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([statsData, projectsData]) => {
        if (statsData && typeof statsData === "object" && !statsData.error) {
          setStats(statsData);
        }
        if (Array.isArray(projectsData)) setProjects(projectsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        {
          label: "Total Clients",
          value: stats.totalClients.toLocaleString("en-US"),
          icon: Users,
        },
        {
          label: "Active Projects",
          value: stats.activeProjects.toLocaleString("en-US"),
          icon: FolderKanban,
        },
        {
          label: "Recognized Revenue",
          value: formatCents(stats.totalRevenue),
          icon: CreditCard,
        },
        {
          label: "Unread Messages",
          value: stats.unreadMessages.toLocaleString("en-US"),
          icon: MessageSquare,
        },
      ]
    : [];

  const recentProjects = [...projects]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command Center"
        title="Agency Dashboard"
        description="Your pulse across clients, projects, pipeline, and revenue."
      />

      {/* Stats grid — hidden entirely for VAs (agency-wide numbers are admin/PM only) */}
      {!statsDenied && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !stats
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                />
              ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange" />
              Recent Projects
            </CardTitle>
            <Link
              href="/admin/projects"
              className="text-sm text-muted-foreground hover:text-orange transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <EmptyState icon={FolderKanban} title="Loading projects…" description="" />
            ) : recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Client projects will appear here once they onboard."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Project</th>
                      <th className="pb-3 font-medium">Service</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentProjects.map((project) => (
                      <tr key={project.id} className="group hover:bg-muted/50">
                        <td className="py-3 font-medium">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="transition-colors group-hover:text-orange"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {serviceLabels[project.serviceType] ?? project.serviceType}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusBadgeVariant(project.status)}>
                            {project.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline snapshot + quick actions */}
        <div className="space-y-6">
          {!statsDenied && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-orange" />
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tracking-tight">
                    {loading || !stats ? "—" : stats.newLeads}
                  </p>
                  <p className="text-sm text-muted-foreground">New leads</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {loading || !stats ? "—" : stats.totalLeads}
                  </p>
                  <p className="text-xs text-muted-foreground">Total captured</p>
                </div>
              </div>
              <Link
                href="/admin/leads"
                className="inline-flex items-center gap-1 text-sm font-medium text-orange hover:underline"
              >
                Triage leads <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(statsDenied
                ? quickLinks.filter((l) => l.href === "/admin/projects")
                : quickLinks
              ).map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-orange/40 hover:bg-orange/5"
                  >
                    <Icon className="h-4 w-4 text-orange" />
                    {link.label}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
