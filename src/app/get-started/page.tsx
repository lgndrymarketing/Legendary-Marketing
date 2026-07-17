"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { services, type ServiceType } from "@/lib/services";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle,
  Loader2,
} from "lucide-react";

const steps = [
  { id: "service", title: "What you need" },
  { id: "business", title: "Your business" },
  { id: "contact", title: "Your plan" },
];

const budgetOptions = ["Under $1k", "$1k–$5k", "$5k–$20k", "$20k+"];

export default function GetStartedPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    serviceInterest: "" as ServiceType | "",
    company: "",
    website: "",
    monthlyBudget: "",
    name: "",
    email: "",
    phone: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return form.serviceInterest !== "";
      case 1:
        return form.company.trim() !== "" && form.monthlyBudget !== "";
      case 2:
        return form.name.trim() !== "" && form.email.includes("@");
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const message =
        [form.website.trim() ? `Website: ${form.website.trim()}` : null]
          .filter(Boolean)
          .join("\n") || undefined;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company,
          serviceInterest: form.serviceInterest,
          monthlyBudget: form.monthlyBudget,
          message,
          source: "get_started_funnel",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 pt-16 bg-background">
        {/* Hero */}
        <section className="relative py-16 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_50%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mx-auto max-w-3xl px-4 text-center"
          >
            <Badge variant="orange" className="mb-4">
              Free Growth Plan
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Get your free{" "}
              <span className="text-gradient-orange">growth plan</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us about your business in under 2 minutes and we&apos;ll map
              out the ads, funnel, and follow-up system to turn your ad spend
              into predictable leads and ROAS.
            </p>
          </motion.div>
        </section>

        {/* Funnel */}
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-4">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border">
                  <CardContent className="p-10 text-center">
                    <CheckCircle className="h-14 w-14 text-success mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">
                      Your growth plan is on the way
                    </h2>
                    <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                      Thanks, {form.name.split(" ")[0]}. Our team is reviewing
                      your goals now — we&apos;ll reach out within one business
                      day with your custom plan.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <RainbowButton
                        className="h-11 px-6 text-sm rounded-xl"
                        asChild
                      >
                        <Link href="/sign-up">
                          Create your client account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </RainbowButton>
                      <Button variant="outline" asChild>
                        <Link href="/">Back to home</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="flex items-center justify-center mb-8">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                            index < currentStep
                              ? "bg-orange text-white"
                              : index === currentStep
                              ? "bg-orange/20 text-orange border-2 border-orange"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index < currentStep ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className="mt-2 text-xs text-muted-foreground hidden sm:block">
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`mx-2 h-0.5 w-10 sm:w-20 transition-all ${
                            index < currentStep ? "bg-orange" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Card className="border-border">
                  {/* Step 0: Service interest */}
                  {currentStep === 0 && (
                    <>
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          What do you need?
                        </CardTitle>
                        <CardDescription>
                          Pick the area where you want results first — your
                          plan will be built around it.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {services.map((service) => {
                            const Icon = service.icon;
                            const isSelected =
                              form.serviceInterest === service.id;
                            return (
                              <button
                                key={service.id}
                                onClick={() =>
                                  updateField("serviceInterest", service.id)
                                }
                                className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-orange bg-orange/5 shadow-lg shadow-orange-glow/10"
                                    : "border-border hover:border-orange/30"
                                }`}
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10">
                                  <Icon className="h-5 w-5 text-orange" />
                                </div>
                                <div>
                                  <p className="font-semibold">
                                    {service.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {service.description}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Badge variant="orange" className="mt-auto">
                                    Selected
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 1: Business details */}
                  {currentStep === 1 && (
                    <>
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          About your business
                        </CardTitle>
                        <CardDescription>
                          A little context so we can size the opportunity and
                          tailor your plan.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Company name{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="Acme Inc."
                            value={form.company}
                            onChange={(e) =>
                              updateField("company", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Website (optional)
                          </label>
                          <Input
                            placeholder="https://example.com"
                            value={form.website}
                            onChange={(e) =>
                              updateField("website", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Monthly ad budget{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {budgetOptions.map((option) => (
                              <button
                                key={option}
                                onClick={() =>
                                  updateField("monthlyBudget", option)
                                }
                                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all cursor-pointer ${
                                  form.monthlyBudget === option
                                    ? "border-orange bg-orange/5 text-orange"
                                    : "border-border text-muted-foreground hover:border-orange/30 hover:text-foreground"
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 2: Contact details */}
                  {currentStep === 2 && (
                    <>
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          Where do we send your plan?
                        </CardTitle>
                        <CardDescription>
                          We&apos;ll put together your growth plan and reach
                          out within one business day.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="John Doe"
                            value={form.name}
                            onChange={(e) =>
                              updateField("name", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Email <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder="john@company.com"
                            value={form.email}
                            onChange={(e) =>
                              updateField("email", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Phone (optional)
                          </label>
                          <Input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={form.phone}
                            onChange={(e) =>
                              updateField("phone", e.target.value)
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          No spam, no obligation — just a plan for more leads
                          at a better ROAS.
                        </p>
                      </CardContent>
                    </>
                  )}

                  {/* Navigation */}
                  <div className="flex flex-col gap-3 p-6 pt-0">
                    {submitError && (
                      <p className="text-sm text-destructive text-center">
                        {submitError}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep((s) => s - 1)}
                        disabled={currentStep === 0}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back
                      </Button>

                      {currentStep < steps.length - 1 ? (
                        <Button
                          onClick={() => setCurrentStep((s) => s + 1)}
                          disabled={!canProceed()}
                        >
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="glow"
                          onClick={handleSubmit}
                          disabled={!canProceed() || isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Get My Free Growth Plan
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
