"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Users, Plus, Pencil, X } from "lucide-react";

interface ClientRow {
  id: string;
  contactName: string;
  companyName: string;
  businessType: string | null;
  package: "bronze" | "silver" | "gold" | "diamond" | "custom";
  packageLabel: string | null;
  setupFee: number;
  monthlyFee: number;
  partnerCut: number;
  startDate: string;
  nextDueDate: string | null;
  status: "active" | "paused" | "churned";
  userId: string | null;
  notes: string | null;
  portalEmail: string | null;
}

interface PortalUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

const BUSINESS_TYPES = [
  "Car Rental",
  "Home Services",
  "Coach",
  "Consultant",
  "Credit Repair",
  "Tax Advisory",
  "Legal",
  "E-commerce",
  "Dental",
  "Chiropractic",
  "Med Spa",
  "Custom…",
];

const PACKAGES = ["bronze", "silver", "gold", "diamond", "custom"] as const;
const STATUSES = ["active", "paused", "churned"] as const;

const usd = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const packageBadge: Record<ClientRow["package"], string> = {
  bronze: "bg-muted text-foreground",
  silver: "border border-border bg-background text-muted-foreground",
  gold: "bg-orange/10 text-orange",
  diamond: "bg-foreground text-background",
  custom: "border border-dashed border-border bg-background text-foreground",
};

const statusClass = (s: string) =>
  s === "active"
    ? "text-success"
    : s === "paused"
    ? "text-warning"
    : "text-destructive";

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

const emptyForm = {
  contactName: "",
  companyName: "",
  businessType: "Coach",
  businessTypeCustom: "",
  package: "gold" as string,
  packageLabel: "",
  setupFee: "",
  monthlyFee: "",
  partnerCut: "0",
  startDate: "",
  nextDueDate: "",
  status: "active" as string,
  userId: "",
  notes: "",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </div>
  );
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    fetch("/api/admin/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.clients)) {
          setClients(data.clients);
          setPortalUsers(data.portalUsers ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, startDate: new Date().toISOString().slice(0, 10) });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(c: ClientRow) {
    setEditingId(c.id);
    setForm({
      contactName: c.contactName,
      companyName: c.companyName,
      businessType:
        c.businessType && BUSINESS_TYPES.includes(c.businessType)
          ? c.businessType
          : "Custom…",
      businessTypeCustom:
        c.businessType && !BUSINESS_TYPES.includes(c.businessType)
          ? c.businessType
          : "",
      package: c.package,
      packageLabel: c.packageLabel ?? "",
      setupFee: String(c.setupFee / 100),
      monthlyFee: String(c.monthlyFee / 100),
      partnerCut: String(c.partnerCut / 100),
      startDate: c.startDate.slice(0, 10),
      nextDueDate: c.nextDueDate ? c.nextDueDate.slice(0, 10) : "",
      status: c.status,
      userId: c.userId ?? "",
      notes: c.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactName.trim() || !form.companyName.trim()) {
      setError("Contact and company name are required.");
      return;
    }
    const cents = (v: string) => Math.round((parseFloat(v) || 0) * 100);
    const payload = {
      contactName: form.contactName.trim(),
      companyName: form.companyName.trim(),
      businessType:
        form.businessType === "Custom…"
          ? form.businessTypeCustom.trim() || "Custom"
          : form.businessType,
      package: form.package,
      packageLabel:
        form.package === "custom" ? form.packageLabel.trim() || null : null,
      setupFee: cents(form.setupFee),
      monthlyFee: cents(form.monthlyFee),
      partnerCut: cents(form.partnerCut),
      startDate: new Date(form.startDate + "T00:00:00Z").toISOString(),
      nextDueDate: form.nextDueDate
        ? new Date(form.nextDueDate + "T00:00:00Z").toISOString()
        : null,
      status: form.status,
      userId: form.userId || null,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/admin/clients/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();
      setModalOpen(false);
      load();
    } catch {
      setError("Could not save the client — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHero
        title="Clients"
        description="The agency roster — packages, retainers, setup fees, and client statuses."
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Client
          </Button>
        }
      />

      <section>
        <BracketLabel n={clients.length} label="CLIENTS" className="pb-4" />
        {loading ? (
          <TableSkeleton rows={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client with their package and retainer — Financials builds MRR and package metrics from this roster."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Company</th>
                  <th className="micro-label py-3 pr-4">Contact</th>
                  <th className="micro-label py-3 pr-4">Package</th>
                  <th className="micro-label py-3 pr-4">Monthly</th>
                  <th className="micro-label py-3 pr-4">Setup</th>
                  <th className="micro-label py-3 pr-4">Status</th>
                  <th className="micro-label py-3 pr-4">Next Due</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {clients.map((client) => (
                  <motion.tr
                    key={client.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium">{client.companyName}</p>
                      {client.portalEmail && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {client.portalEmail}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {client.contactName}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                          packageBadge[client.package]
                        )}
                      >
                        {client.package === "custom" && client.packageLabel
                          ? client.packageLabel
                          : client.package}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {usd(client.monthlyFee)}
                      <span className="font-normal text-muted-foreground">/mo</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">
                      {usd(client.setupFee)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold uppercase tracking-wide",
                          statusClass(client.status)
                        )}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {client.nextDueDate
                        ? new Date(client.nextDueDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openEdit(client)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 cursor-pointer"
                        aria-label={`Edit ${client.companyName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submit}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <h2 className="text-xl font-bold tracking-tight">
                  {editingId ? "Edit Client" : "Add New Client"}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contact Name" required>
                  <Input
                    placeholder="John Doe"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Company Name" required>
                  <Input
                    placeholder="Acme Corp"
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Business Type">
                  <select
                    className={selectClass}
                    value={form.businessType}
                    onChange={(e) =>
                      setForm({ ...form, businessType: e.target.value })
                    }
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {form.businessType === "Custom…" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom type"
                      value={form.businessTypeCustom}
                      onChange={(e) =>
                        setForm({ ...form, businessTypeCustom: e.target.value })
                      }
                    />
                  )}
                </Field>
                <Field label="Package">
                  <select
                    className={selectClass}
                    value={form.package}
                    onChange={(e) =>
                      setForm({ ...form, package: e.target.value })
                    }
                  >
                    {PACKAGES.map((p) => (
                      <option key={p} value={p}>
                        {p === "custom" ? "Custom…" : p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  {form.package === "custom" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom package name"
                      value={form.packageLabel}
                      onChange={(e) =>
                        setForm({ ...form, packageLabel: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Setup Fee ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="1500"
                    value={form.setupFee}
                    onChange={(e) =>
                      setForm({ ...form, setupFee: e.target.value })
                    }
                  />
                </Field>
                <Field label="Monthly Fee ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="500"
                    value={form.monthlyFee}
                    onChange={(e) =>
                      setForm({ ...form, monthlyFee: e.target.value })
                    }
                  />
                </Field>
                <Field label="Partner Cut ($)">
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={form.partnerCut}
                    onChange={(e) =>
                      setForm({ ...form, partnerCut: e.target.value })
                    }
                  />
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    Deducted before 50/50 split
                  </p>
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Next Due Date">
                  <Input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) =>
                      setForm({ ...form, nextDueDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Portal Account (optional)">
                  <select
                    className={selectClass}
                    value={form.userId}
                    onChange={(e) =>
                      setForm({ ...form, userId: e.target.value })
                    }
                  >
                    <option value="">Not linked</option>
                    {portalUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                          u.email}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Notes">
                  <Input
                    placeholder="Anything worth remembering about this client"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </Field>
              </div>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Client"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
