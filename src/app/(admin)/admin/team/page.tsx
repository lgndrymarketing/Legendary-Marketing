"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { UserCog, ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";

interface TeamUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

const roleOptions: UserRole[] = ["admin", "project_manager", "va", "client"];

const roleBadgeVariant: Record<UserRole, "orange" | "success" | "secondary" | "warning"> = {
  admin: "orange",
  project_manager: "success",
  va: "secondary",
  client: "warning",
};

export default function AdminTeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = () => {
    fetch("/api/team?includeClients=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const updateRole = async (userId: string, role: UserRole) => {
    setUpdating(userId);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(null);
    }
  };

  const staff = users.filter((u) => u.role !== "client");
  const matchingClient = promoteEmail
    ? users.find(
        (u) => u.role === "client" && u.email.toLowerCase() === promoteEmail.toLowerCase()
      )
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Manage staff access. Admins have full control, project managers run client work day-to-day, and VAs have scoped, task-level access."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-orange" />
            Promote a Client to Staff
          </CardTitle>
          <CardDescription>
            Team members sign up like any client first — enter their account email to
            grant them a staff role.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="teammate@legendarymarketing.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            className="sm:max-w-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {(["project_manager", "va", "admin"] as UserRole[]).map((role) => (
              <Button
                key={role}
                size="sm"
                variant="outline"
                disabled={!matchingClient || updating === matchingClient?.id}
                onClick={() => matchingClient && updateRole(matchingClient.id, role)}
              >
                Make {ROLE_LABELS[role]}
              </Button>
            ))}
          </div>
        </CardContent>
        {promoteEmail && !matchingClient && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              No client account found with that email yet — they need to sign up first.
            </p>
          </CardContent>
        )}
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange" />
            Staff Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={4} />
          ) : staff.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No staff members yet"
              description="Promote a client account above to give them agency access."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff.map((member) => (
                    <tr key={member.id} className="group hover:bg-muted/50">
                      <td className="py-3 font-medium transition-colors group-hover:text-orange">
                        {[member.firstName, member.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">{member.email}</td>
                      <td className="py-3">
                        <Badge variant={roleBadgeVariant[member.role]}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <select
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          value={member.role}
                          disabled={updating === member.id}
                          onChange={(e) => updateRole(member.id, e.target.value as UserRole)}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
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
