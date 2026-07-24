"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { TableSkeleton } from "@/components/ui/skeleton";
import { rowCascade, rowItem } from "@/lib/motion";
import {
  UserCog,
  ShieldCheck,
  UserPlus,
  Pencil,
  X,
  Send,
  Trash2,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";

interface TeamUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  department: string | null;
}

const roleOptions: UserRole[] = ["admin", "project_manager", "va", "client"];

const DEPARTMENTS = [
  { value: "csm", label: "CSM" },
  { value: "funnel", label: "Funnel" },
  { value: "automations", label: "Automations" },
  { value: "ads", label: "Ads" },
];
const deptLabel = (v: string | null) =>
  DEPARTMENTS.find((d) => d.value === v)?.label ?? "—";

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function AdminTeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "project_manager" as UserRole,
    department: "",
  });

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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(null);
    }
  };

  function openAdd() {
    setEditing(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      role: "project_manager",
      department: "",
    });
    setNotice(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(u: TeamUser) {
    setEditing(u);
    setForm({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.email,
      role: u.role,
      department: u.department ?? "",
    });
    setNotice(null);
    setError(null);
    setModalOpen(true);
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.firstName.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        role: form.role,
        department: form.department || null,
      };
      const res = editing
        ? await fetch("/api/team", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: editing.id,
              ...body,
              resendInvite: editing.email !== form.email.trim().toLowerCase(),
            }),
          })
        : await fetch("/api/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      fetchTeam();
      if (data.inviteStatus === "sent") {
        setNotice("Invite email sent.");
        setModalOpen(false);
      } else if (data.inviteStatus === "failed") {
        setNotice(
          "Saved, but the invite email could not be sent — check Clerk config."
        );
      } else {
        setModalOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(u: TeamUser) {
    const label = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
    if (
      !window.confirm(
        `Remove ${label} from the team? Their checklist assignments keep their name; their login is revoked.`
      )
    )
      return;
    setUpdating(u.id);
    setNotice(null);
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setNotice(
        data?.clerkStatus === "failed"
          ? `${label} removed — revoke their login in Clerk manually.`
          : `${label} removed from the team.`
      );
      fetchTeam();
    } catch (err) {
      setNotice(
        err instanceof Error && err.message !== "failed"
          ? err.message
          : "Could not remove the team member — try again."
      );
    } finally {
      setUpdating(null);
    }
  }

  async function resendInvite(u: TeamUser) {
    setUpdating(u.id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, resendInvite: true }),
      });
      const data = await res.json().catch(() => ({}));
      setNotice(
        data.inviteStatus === "sent"
          ? `Invite re-sent to ${u.email}.`
          : "Could not send the invite — check Clerk config."
      );
    } finally {
      setUpdating(null);
    }
  }

  const staff = users.filter((u) => u.role !== "client");

  return (
    <div className="space-y-10">
      <PageHero
        title="Team"
        description="Manage staff access and departments. Add a team member to send them a portal invite — they become assignable across the Client CRM instantly."
        action={
          <Button variant="glow" onClick={openAdd}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Team Member
          </Button>
        }
      />

      {notice && (
        <p className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
          {notice}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

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
            description="Add a team member to send them a portal invite and start assigning work."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Name</th>
                  <th className="micro-label py-3 pr-4">Email</th>
                  <th className="micro-label py-3 pr-4">Department</th>
                  <th className="micro-label py-3 pr-4">Role</th>
                  <th className="micro-label py-3 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {staff.map((member) => {
                  const pending = member.email.startsWith("invite:") ||
                    false;
                  return (
                    <motion.tr
                      key={member.id}
                      variants={rowItem}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 font-medium transition-colors group-hover:text-orange">
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {member.email}
                        {pending && (
                          <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[10px] uppercase text-warning">
                            Invited
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {deptLabel(member.department)}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-orange/40 focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-50"
                          value={member.role}
                          disabled={updating === member.id}
                          onChange={(e) =>
                            updateRole(member.id, e.target.value as UserRole)
                          }
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => resendInvite(member)}
                          disabled={updating === member.id}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
                          aria-label="Resend invite"
                          title="Resend invite"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(member)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                          aria-label="Edit member"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {member.role !== "admin" && (
                          <button
                            onClick={() => removeMember(member)}
                            disabled={updating === member.id}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer disabled:opacity-50"
                            aria-label={`Remove ${member.firstName ?? member.email}`}
                            title="Remove from team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / edit member modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={saveMember}
              className="beam-focus relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  {editing ? "Edit Team Member" : "Add Team Member"}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold">
                      First Name
                    </span>
                    <Input
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      placeholder="Virginia"
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold">
                      Last Name
                    </span>
                    <Input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Email
                  </span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="teammate@lgndrymarketing.app"
                  />
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    We&apos;ll email them a secure invite to set their password.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold">
                      Department
                    </span>
                    <select
                      className={selectClass}
                      value={form.department}
                      onChange={(e) =>
                        setForm({ ...form, department: e.target.value })
                      }
                    >
                      <option value="">No department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold">
                      Role
                    </span>
                    <select
                      className={selectClass}
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value as UserRole })
                      }
                    >
                      {(
                        ["project_manager", "va", "admin"] as UserRole[]
                      ).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {notice && (
                  <p className="text-sm text-muted-foreground">{notice}</p>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="glow" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save" : "Add & Invite"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
