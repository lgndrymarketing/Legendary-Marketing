"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { INDUSTRIES } from "@/lib/crm";

const PACKAGES = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
  { value: "rev_split", label: "Rev Split" },
  { value: "custom", label: "Custom" },
];

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

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

/** Create New Client — records the client, seeds the onboarding checklist, and
 * emails a Clerk portal invitation to the login email. */
export function NewClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    contactName: "",
    companyName: "",
    email: "",
    industry: "",
    industryCustom: "",
    package: "",
    packageCustom: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm({
      contactName: "",
      companyName: "",
      email: "",
      industry: "",
      industryCustom: "",
      package: "",
      packageCustom: "",
    });
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactName.trim() || !form.companyName.trim()) {
      setError("Contact and business name are required.");
      return;
    }
    const industry =
      form.industry === "Custom"
        ? form.industryCustom.trim() || "Custom"
        : form.industry || undefined;
    const pkg = form.package || undefined;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: form.contactName.trim(),
          companyName: form.companyName.trim(),
          email: form.email.trim() || undefined,
          businessType: industry,
          ...(pkg && pkg !== "custom" && { package: pkg }),
          ...(pkg === "custom" && {
            package: "custom",
            packageLabel: form.packageCustom.trim() || "Custom",
          }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      reset();
      onClose();
      onCreated();
    } catch {
      setError("Could not create the client — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            onSubmit={submit}
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
          >
            <div className="flex items-start justify-between pb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                Create New Client
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

            <div className="space-y-4">
              <Field label="Contact Name">
                <Input
                  placeholder="John Doe"
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label="Business Name">
                <Input
                  placeholder="Acme Corp"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                />
              </Field>
              <Field label="Login Email">
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                  We&apos;ll email them a secure invite to set their own
                  password and access the portal.
                </p>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                variant="glow"
                className="w-full"
                disabled={saving}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {saving ? "Creating…" : "Create Client & Portal"}
              </Button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
