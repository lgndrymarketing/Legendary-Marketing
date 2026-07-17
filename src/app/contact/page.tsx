"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Mail, MapPin, Clock, Loader2, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          serviceInterest: form.service || undefined,
          message: form.message,
          source: "contact_form",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-24 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,74,0,0.12),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <Badge variant="orange" className="mb-4">Contact</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Let&apos;s talk about{" "}
              <span className="text-gradient-orange">your project</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question or ready to start? Drop us a message and we&apos;ll
              get back to you within 24 hours.
            </p>
          </div>
        </section>

        {/* Contact Form + Info */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
              {/* Form */}
              <div className="lg:col-span-3">
                <Card>
                  <CardContent className="p-6 sm:p-8">
                    {submitted ? (
                      <div className="text-center py-12">
                        <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">Message sent!</h3>
                        <p className="text-muted-foreground mt-2">
                          We&apos;ll get back to you within 24 hours.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-6"
                          onClick={() => {
                            setSubmitted(false);
                            setForm({ name: "", email: "", company: "", service: "", message: "" });
                          }}
                        >
                          Send another message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">
                              Name <span className="text-destructive">*</span>
                            </label>
                            <Input
                              required
                              placeholder="John Doe"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">
                              Email <span className="text-destructive">*</span>
                            </label>
                            <Input
                              required
                              type="email"
                              placeholder="john@company.com"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Company</label>
                            <Input
                              placeholder="Acme Inc."
                              value={form.company}
                              onChange={(e) => setForm({ ...form, company: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">
                              Service interested in
                            </label>
                            <select
                              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={form.service}
                              onChange={(e) => setForm({ ...form, service: e.target.value })}
                            >
                              <option value="">Select a service</option>
                              <option value="paid_advertising">Paid Advertising</option>
                              <option value="funnel_build">High-Converting Funnels</option>
                              <option value="website_design">Websites & Landing Pages</option>
                              <option value="crm_automation">CRM & Automation</option>
                              <option value="not_sure">Not sure yet</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Message <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            required
                            placeholder="Tell us about your project, goals, and any specific requirements..."
                            rows={5}
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive text-center">{error}</p>
                        )}
                        <Button
                          type="submit"
                          variant="glow"
                          size="lg"
                          className="w-full"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Send Message
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          No spam. We&apos;ll respond within 24 hours.
                        </p>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10">
                      <Mail className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-sm text-muted-foreground mt-1">hello@legendarymarketing.com</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10">
                      <Clock className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Response Time</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We typically respond within 24 hours during business days.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10">
                      <MapPin className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Location</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Remote-first agency serving clients worldwide.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">Prefer to jump right in?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Skip the form and start your project directly through our platform.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/sign-up">Create Account & Start</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
