"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { TableSkeleton } from "@/components/ui/skeleton";
import { rowCascade, rowItem } from "@/lib/motion";
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
    <div className="space-y-10">
      <PageHero
        title="Team"
        description="Manage staff access. Admins have full control, project managers run client work day-to-day, and VAs have scoped, task-level access."
      />

      {/* Promote a client to staff */}
      <section className="border-b border-border pb-8">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Promote a Client to Staff</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Team members sign up like any client first — enter their account email to
          grant them a staff role.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        </div>
        {promoteEmail && !matchingClient && (
          <p className="mt-3 text-xs text-muted-foreground">
            No client account found with that email yet — they need to sign up first.
          </p>
        )}
      </section>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Staff members */}
      <section>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange" />
            <h2 className="text-[15px] font-semibold">Staff Members</h2>
          </div>
          <BracketLabel n={staff.length} label="STAFF" />
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={4} />
          </div>
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
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Name</th>
                  <th className="micro-label py-3 pr-4">Email</th>
                  <th className="micro-label py-3 pr-4">Role</th>
                  <th className="micro-label py-3">Change Role</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {staff.map((member) => (
                  <motion.tr
                    key={member.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium transition-colors group-hover:text-orange">
                      {[member.firstName, member.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{member.email}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={roleBadgeVariant[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <select
                        className="cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-orange/40 focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-50"
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
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
