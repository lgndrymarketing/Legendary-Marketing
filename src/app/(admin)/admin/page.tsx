"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  FolderKanban,
  CreditCard,
  MessageSquare,
  TrendingUp,
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

// Revenue is stored in cents — format as whole dollars ("$X,XXX"), matching
// the Payments page.
function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

const statusBadgeVariant = (status: string): "success" | "warning" | "orange" =>
  status === "completed"
    ? "success"
    : status === "payment_pending" || status === "cancelled"
    ? "warning"
    : "orange";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/projects").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([statsData, projectsData]) => {
        if (statsData && typeof statsData === "object" && !statsData.error) {
          setStats(statsData);
        }
        if (Array.isArray(projectsData)) setProjects(projectsData);
      })
      .catch(() => {
        /* leave loading/empty states in place */
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: "Total Clients",
      value: stats ? stats.totalClients.toLocaleString("en-US") : "—",
      icon: Users,
    },
    {
      label: "Active Projects",
      value: stats ? stats.activeProjects.toLocaleString("en-US") : "—",
      icon: FolderKanban,
    },
    {
      label: "Revenue",
      value: stats ? formatCents(stats.totalRevenue) : "—",
      icon: CreditCard,
    },
    {
      label: "Unread Messages",
      value: stats ? stats.unreadMessages.toLocaleString("en-US") : "—",
      icon: MessageSquare,
    },
  ];

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Agency Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all clients, projects, and payments.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10">
                  <Icon className="h-6 w-6 text-orange" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange" />
            Recent Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <EmptyState
              icon={FolderKanban}
              title="Loading projects..."
              description=""
            />
          ) : recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Client projects will appear here once they're created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Phase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="hover:text-orange transition-colors"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {serviceLabels[project.serviceType] ??
                          project.serviceType}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusBadgeVariant(project.status)}>
                          {project.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {project.currentPhase + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
