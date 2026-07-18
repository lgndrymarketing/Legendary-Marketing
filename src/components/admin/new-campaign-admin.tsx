"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { services, type ServiceType } from "@/lib/services";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface PortalUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

const selectClass =
  "h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

/** Admin-side campaign creation — pick the client, name it, pick the service. */
export function NewAdminCampaignButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<PortalUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    userId: "",
    name: "",
    serviceType: "" as ServiceType | "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.portalUsers) setClients(data.portalUsers);
      })
      .catch(() => {});
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.userId || !form.name.trim() || !form.serviceType) {
      setError("Pick a client, name the campaign, and choose a service.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId,
          name: form.name.trim(),
          serviceType: form.serviceType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      setOpen(false);
      setForm({ userId: "", name: "", serviceType: "" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "failed"
          ? err.message
          : "Could not create the campaign — try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const clientLabel = (u: PortalUser) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        New Campaign
      </Button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-xl"
              onClick={() => setOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submit}
              className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <div>
                  <p className="bracket-label">[ Campaign Builder ]</p>
                  <h2 className="mt-1.5 text-xl font-bold tracking-tight">
                    New Campaign
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Client <span className="text-destructive">*</span>
                  </span>
                  <select
                    className={selectClass}
                    value={form.userId}
                    onChange={(e) =>
                      setForm({ ...form, userId: e.target.value })
                    }
                  >
                    <option value="">Select client…</option>
                    {clients.map((u) => (
                      <option key={u.id} value={u.id}>
                        {clientLabel(u)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Campaign Name <span className="text-destructive">*</span>
                  </span>
                  <Input
                    placeholder="e.g. Q3 Lead Generation"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Service <span className="text-destructive">*</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {services.map((service) => {
                      const isSelected = form.serviceType === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, serviceType: service.id })
                          }
                          className={cn(
                            "rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer",
                            isSelected
                              ? "border-orange bg-orange/[0.06] text-orange ring-1 ring-orange"
                              : "border-border hover:border-foreground/25"
                          )}
                        >
                          {service.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create Campaign"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
