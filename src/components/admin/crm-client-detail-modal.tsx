"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { INDUSTRIES, SAAS_PLANS } from "@/lib/crm";

const PACKAGES = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
  { value: "rev_split", label: "Rev Split" },
  { value: "custom", label: "Custom" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "churned", label: "Canceled" },
];

const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

interface Task {
  id: string;
  title: string;
  status: string;
  assigneeName: string | null;
}

interface Req {
  id: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ClientData {
  id: string;
  contactName: string;
  companyName: string;
  businessType: string | null;
  package: string;
  packageLabel: string | null;
  saasPlan: string | null;
  status: string;
  startDate: string;
  driveUrl: string | null;
  landingPageUrl: string | null;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
    </div>
  );
}

/** Client Details & Tasks — edit metadata + assets and manage the onboarding
 * checklist. Task status changes save immediately (auto-advancing the pipeline
 * stage); metadata saves on "Save Changes". */
export function ClientDetailModal({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    status: "active",
    industry: "",
    industryCustom: "",
    package: "",
    packageCustom: "",
    saasPlan: "",
    saasPlanCustom: "",
    startDate: "",
    driveUrl: "",
    landingPageUrl: "",
  });

  const load = useCallback(() => {
    if (!clientId) return;
    fetch(`/api/admin/clients/${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.client) return;
        const c: ClientData = data.client;
        const knownIndustry =
          c.businessType && INDUSTRIES.includes(c.businessType);
        const knownPlan = c.saasPlan && SAAS_PLANS.includes(c.saasPlan);
        setForm({
          companyName: c.companyName,
          contactName: c.contactName,
          status: c.status,
          industry: c.businessType
            ? knownIndustry
              ? c.businessType
              : "Custom"
            : "",
          industryCustom:
            c.businessType && !knownIndustry ? c.businessType : "",
          package: c.package,
          packageCustom: c.package === "custom" ? c.packageLabel ?? "" : "",
          saasPlan: c.saasPlan ? (knownPlan ? c.saasPlan : "Custom") : "",
          saasPlanCustom: c.saasPlan && !knownPlan ? c.saasPlan : "",
          startDate: c.startDate ? c.startDate.slice(0, 10) : "",
          driveUrl: c.driveUrl ?? "",
          landingPageUrl: c.landingPageUrl ?? "",
        });
        setTasks(data.tasks ?? []);
        setRequests(data.requests ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      setLoading(true);
      load();
    }
  }, [clientId, load]);

  async function setTaskStatus(taskId: string, status: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    await fetch(`/api/admin/client-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onSaved();
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`/api/admin/client-tasks/${taskId}`, { method: "DELETE" });
    onSaved();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim() || !clientId) return;
    const res = await fetch(`/api/admin/clients/${clientId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask.trim() }),
    });
    if (res.ok) {
      setNewTask("");
      load();
    }
  }

  async function save() {
    if (!clientId) return;
    setSaving(true);
    const industry =
      form.industry === "Custom"
        ? form.industryCustom.trim() || "Custom"
        : form.industry || null;
    try {
      await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          status: form.status,
          businessType: industry,
          package: form.package || undefined,
          packageLabel:
            form.package === "custom"
              ? form.packageCustom.trim() || "Custom"
              : null,
          saasPlan:
            form.saasPlan === "Custom"
              ? form.saasPlanCustom.trim() || "Custom"
              : form.saasPlan || null,
          startDate: form.startDate
            ? new Date(form.startDate + "T00:00:00Z").toISOString()
            : undefined,
          driveUrl: form.driveUrl.trim() || null,
          landingPageUrl: form.landingPageUrl.trim() || null,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "completed").length;

  return (
    <AnimatePresence>
      {clientId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="beam-focus relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
          >
            <div className="flex items-start justify-between pb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                Client Details &amp; Tasks
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : (
              <>
                {/* Metadata */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Business Name">
                    <Input
                      value={form.companyName}
                      onChange={(e) =>
                        setForm({ ...form, companyName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Contact Name">
                    <Input
                      value={form.contactName}
                      onChange={(e) =>
                        setForm({ ...form, contactName: e.target.value })
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
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Industry">
                    <select
                      className={selectClass}
                      value={form.industry}
                      onChange={(e) =>
                        setForm({ ...form, industry: e.target.value })
                      }
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                    {form.industry === "Custom" && (
                      <Input
                        className="mt-2"
                        placeholder="Custom industry"
                        value={form.industryCustom}
                        onChange={(e) =>
                          setForm({ ...form, industryCustom: e.target.value })
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
                      <option value="">Select package</option>
                      {PACKAGES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {form.package === "custom" && (
                      <Input
                        className="mt-2"
                        placeholder="Custom package name"
                        value={form.packageCustom}
                        onChange={(e) =>
                          setForm({ ...form, packageCustom: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field label="SaaS Plan">
                    <select
                      className={selectClass}
                      value={form.saasPlan}
                      onChange={(e) =>
                        setForm({ ...form, saasPlan: e.target.value })
                      }
                    >
                      <option value="">Select plan</option>
                      {SAAS_PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {form.saasPlan === "Custom" && (
                      <Input
                        className="mt-2"
                        placeholder="Custom plan name"
                        value={form.saasPlanCustom}
                        onChange={(e) =>
                          setForm({ ...form, saasPlanCustom: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Date Started">
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4 space-y-4">
                  <Field label="Google Drive Link">
                    <Input
                      placeholder="https://drive.google.com/..."
                      value={form.driveUrl}
                      onChange={(e) =>
                        setForm({ ...form, driveUrl: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Landing Page Link">
                    <Input
                      placeholder="https://..."
                      value={form.landingPageUrl}
                      onChange={(e) =>
                        setForm({ ...form, landingPageUrl: e.target.value })
                      }
                    />
                  </Field>
                </div>

                {/* Onboarding checklist */}
                <div className="mt-8 flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight">
                    Onboarding Checklist{" "}
                    <span className="font-mono text-sm font-normal text-muted-foreground">
                      {done}/{total}
                    </span>
                  </h3>
                  <form onSubmit={addTask} className="flex items-center gap-2">
                    <Input
                      className="h-9 w-40"
                      placeholder="New task"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                    />
                    <Button type="submit" size="sm" variant="outline">
                      <Plus className="mr-1 h-4 w-4" />
                      Add Task
                    </Button>
                  </form>
                </div>
                <div className="mt-4 space-y-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.title}
                        </p>
                        {t.assigneeName && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {t.assigneeName}
                          </p>
                        )}
                      </div>
                      <select
                        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-orange"
                        value={t.status}
                        onChange={(e) => setTaskStatus(t.id, e.target.value)}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No tasks yet.
                    </p>
                  )}
                </div>

                {/* Client requests */}
                <h3 className="mt-8 border-b border-border pb-3 text-lg font-bold tracking-tight">
                  Client Requests
                </h3>
                {requests.length === 0 ? (
                  <p className="py-4 text-sm italic text-muted-foreground">
                    No requests from this client.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {requests.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-border px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 flex-1">{r.description}</p>
                          <span className="shrink-0 font-mono text-[11px] uppercase text-muted-foreground">
                            {r.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="glow"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
