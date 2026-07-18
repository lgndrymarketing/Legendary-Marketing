"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { services, type ServiceType } from "@/lib/services";
import { cn } from "@/lib/utils";
import { Plus, X, Rocket } from "lucide-react";

/**
 * Campaign Builder — a focused modal for existing clients spinning up another
 * campaign. Distinct from first-time onboarding: no business-profile steps,
 * one screen, heavy blur backdrop, launches straight from the dashboard.
 */

const BRAND_CONFETTI = ["#F97316", "#FF7A00", "#FFB347", "#C2410C", "#FDBA74"];

export function NewCampaignButton({
  label = "New Campaign",
  variant = "glow",
  size,
  className,
}: {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    serviceType: "" as ServiceType | "",
    goals: "",
    targetAudience: "",
    timeline: "",
    budget: "",
    notes: "",
  });

  // Deep-link support: the topbar CTA navigates to /dashboard?new=1.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setOpen(true);
      params.delete("new");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : "")
      );
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.serviceType || !form.goals.trim()) {
      setError("Name your campaign, pick a service, and describe the goal.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.name.trim(),
          serviceType: form.serviceType,
          description: form.goals.trim(),
          targetAudience: form.targetAudience || undefined,
          timeline: form.timeline || undefined,
          budget: form.budget || undefined,
          additionalNotes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: BRAND_CONFETTI,
        disableForReducedMotion: true,
      });
      setOpen(false);
      setForm({
        name: "",
        serviceType: "",
        goals: "",
        targetAudience: "",
        timeline: "",
        budget: "",
        notes: "",
      });
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

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        {label}
      </Button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Heavier blur than other modals — this one is its own surface */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-xl"
              onClick={() => setOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onSubmit={submit}
              className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-[0_1px_3px_rgba(15,16,16,0.06),0_32px_80px_-20px_rgba(15,16,16,0.35)]"
            >
              {/* Header band — dot texture + bracket label, the house signature */}
              <div className="relative border-b border-border px-6 py-5 sm:px-8">
                <div
                  className="dot-texture pointer-events-none absolute inset-y-0 right-0 w-40"
                  style={{
                    maskImage: "linear-gradient(to left, black, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(to left, black, transparent)",
                  }}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="bracket-label flex items-center gap-2">
                      <Rocket className="h-3.5 w-3.5 text-orange" />
                      [ Campaign Builder ]
                    </p>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight">
                      Launch a new campaign
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
              </div>

              <div className="space-y-5 px-6 py-6 sm:px-8">
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Campaign Name <span className="text-destructive">*</span>
                  </span>
                  <Input
                    placeholder="e.g. Summer Lead Push"
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

                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Goals <span className="text-destructive">*</span>
                  </span>
                  <Textarea
                    rows={3}
                    placeholder="What should this campaign achieve?"
                    value={form.goals}
                    onChange={(e) =>
                      setForm({ ...form, goals: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="mb-1.5 block text-[13px] font-medium">
                      Audience
                    </span>
                    <Input
                      placeholder="Who is it for?"
                      value={form.targetAudience}
                      onChange={(e) =>
                        setForm({ ...form, targetAudience: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[13px] font-medium">
                      Timeline
                    </span>
                    <Input
                      placeholder="e.g. ASAP"
                      value={form.timeline}
                      onChange={(e) =>
                        setForm({ ...form, timeline: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[13px] font-medium">
                      Budget
                    </span>
                    <Input
                      placeholder="e.g. $2,000/mo"
                      value={form.budget}
                      onChange={(e) =>
                        setForm({ ...form, budget: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Notes
                  </span>
                  <Input
                    placeholder="Anything else we should know?"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4 sm:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="glow" disabled={saving}>
                  {saving ? "Launching…" : "Launch Campaign"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
