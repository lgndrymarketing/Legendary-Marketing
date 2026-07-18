"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { services, type ServiceType } from "@/lib/services";
import { cn } from "@/lib/utils";

const steps = ["service", "business", "goals", "review"] as const;

const BRAND_CONFETTI = ["#F97316", "#FF7A00", "#FFB347", "#C2410C", "#FDBA74"];

function fireConfetti() {
  const defaults = { colors: BRAND_CONFETTI, disableForReducedMotion: true };
  confetti({ ...defaults, particleCount: 120, spread: 75, origin: { y: 0.65 } });
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
      }),
    180
  );
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
      }),
    300
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedService = searchParams.get("service") as ServiceType | null;

  const [currentStep, setCurrentStep] = useState(preselectedService ? 1 : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serviceType: preselectedService || ("" as ServiceType | ""),
    businessName: "",
    industry: "",
    website: "",
    description: "",
    targetAudience: "",
    timeline: "",
    budget: "",
    brandColors: "",
    additionalNotes: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.serviceType !== "";
      case 1:
        return formData.businessName.trim() !== "";
      case 2:
        return formData.description.trim() !== "";
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to submit");
      await res.json();

      // Celebrate, then land in the portal.
      setSubmitted(true);
      fireConfetti();
      setTimeout(() => router.push("/dashboard"), 1600);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s.id === formData.serviceType);
  const progress = ((currentStep + 1) / steps.length) * 100;

  const field = (label: string, required = false) => (
    <label className="mb-1.5 block text-[13px] font-medium">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar — progress + logo */}
      <div className="flex items-center gap-6 px-6 py-5 sm:px-10">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-orange transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Logo size={28} />
      </div>

      {/* Centered form column */}
      <main className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col px-6 pt-14 pb-10">
        {submitted ? (
          <div className="my-auto text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;re all set
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Taking you to your dashboard…
            </p>
          </div>
        ) : (
          <>
            {/* Step 0 — service */}
            {currentStep === 0 && (
              <section>
                <h1 className="text-center text-2xl font-bold tracking-tight">
                  What can we help you with?
                </h1>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Make sure all the required fields (
                  <span className="text-destructive">*</span>) are complete.
                </p>
                <div className="mt-10 space-y-2.5">
                  {services.map((service) => {
                    const isSelected = formData.serviceType === service.id;
                    return (
                      <button
                        key={service.id}
                        onClick={() => updateField("serviceType", service.id)}
                        className={cn(
                          "w-full rounded-lg border px-4 py-3.5 text-left transition-colors cursor-pointer",
                          isSelected
                            ? "border-orange ring-1 ring-orange"
                            : "border-border hover:border-foreground/25"
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            {service.name}
                          </span>
                          <span
                            className={cn(
                              "h-4 w-4 shrink-0 rounded-full border transition-colors",
                              isSelected
                                ? "border-[5px] border-orange"
                                : "border-border"
                            )}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step 1 — business */}
            {currentStep === 1 && (
              <section>
                <h1 className="text-center text-2xl font-bold tracking-tight">
                  Tell us about your business
                </h1>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Make sure all the required fields (
                  <span className="text-destructive">*</span>) are complete.
                </p>
                <div className="mt-10 space-y-5">
                  <div>
                    {field("Company Name", true)}
                    <Input
                      placeholder="Acme Co."
                      value={formData.businessName}
                      onChange={(e) =>
                        updateField("businessName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    {field("Industry")}
                    <Input
                      placeholder="e.g. Technology, Healthcare, Retail"
                      value={formData.industry}
                      onChange={(e) => updateField("industry", e.target.value)}
                    />
                  </div>
                  <div>
                    {field("Website")}
                    <Input
                      placeholder="acme.com"
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                    />
                  </div>
                  <div>
                    {field("Brand Color")}
                    <Input
                      placeholder="#F3F3F3"
                      value={formData.brandColors}
                      onChange={(e) =>
                        updateField("brandColors", e.target.value)
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 2 — goals */}
            {currentStep === 2 && (
              <section>
                <h1 className="text-center text-2xl font-bold tracking-tight">
                  Goals &amp; scope
                </h1>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Make sure all the required fields (
                  <span className="text-destructive">*</span>) are complete.
                </p>
                <div className="mt-10 space-y-5">
                  <div>
                    {field("Goals & Description", true)}
                    <Textarea
                      placeholder="Tell us about your offer, your goals, and what a great outcome looks like…"
                      rows={4}
                      value={formData.description}
                      onChange={(e) =>
                        updateField("description", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    {field("Target Audience")}
                    <Input
                      placeholder="Who is this for?"
                      value={formData.targetAudience}
                      onChange={(e) =>
                        updateField("targetAudience", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      {field("Timeline")}
                      <Input
                        placeholder="e.g. 2–4 weeks"
                        value={formData.timeline}
                        onChange={(e) =>
                          updateField("timeline", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      {field("Budget Range")}
                      <Input
                        placeholder="e.g. $2,000 – $5,000"
                        value={formData.budget}
                        onChange={(e) => updateField("budget", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    {field("Additional Notes")}
                    <Textarea
                      placeholder="Anything else we should know?"
                      rows={3}
                      value={formData.additionalNotes}
                      onChange={(e) =>
                        updateField("additionalNotes", e.target.value)
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 3 — review */}
            {currentStep === 3 && (
              <section>
                <h1 className="text-center text-2xl font-bold tracking-tight">
                  Review &amp; submit
                </h1>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Double-check your details before submitting.
                </p>
                <dl className="mt-10 divide-y divide-border border-y border-border text-sm">
                  {[
                    ["Service", selectedService?.name],
                    ["Company", formData.businessName],
                    ["Industry", formData.industry],
                    ["Website", formData.website],
                    ["Goals", formData.description],
                    ["Target Audience", formData.targetAudience],
                    ["Timeline", formData.timeline],
                    ["Budget", formData.budget],
                    ["Notes", formData.additionalNotes],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[8rem_1fr] gap-4 py-3"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="min-w-0 break-words font-medium">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer bar */}
      {!submitted && (
        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
            {currentStep > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep((s) => s + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit"}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
