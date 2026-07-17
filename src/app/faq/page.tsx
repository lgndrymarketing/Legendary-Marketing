"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqCategories = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How does the process work?",
        a: "It's simple: choose a service, create your account, complete a quick onboarding form covering your business, audience, and goals, and submit payment. Once confirmed, you'll get access to your project dashboard where you can track every phase — from ad account setup to launch — in real-time.",
      },
      {
        q: "How long does it take to launch?",
        a: "Timelines vary by service. Funnels and landing pages typically take 1-2 weeks to build. Paid advertising accounts are usually live within 5-7 business days of onboarding, with the first optimization cycle 2-3 weeks after launch. CRM/GoHighLevel setups typically take 1-2 weeks. Custom or multi-service engagements are scoped individually.",
      },
      {
        q: "What information do I need to provide?",
        a: "During onboarding, we'll ask about your business, offer, target audience, past ad performance (if any), brand guidelines, and access to your ad accounts and CRM. The more detail you provide, the faster we can launch and the better we can target.",
      },
      {
        q: "Can I start without knowing exactly what I need?",
        a: "Absolutely. Our discovery phase is designed to help clarify your goals and the right mix of services. You can also book a free consultation through our contact page and we'll help you figure out the best approach.",
      },
    ],
  },
  {
    category: "Pricing & Payment",
    questions: [
      {
        q: "Is ad spend included in your fees?",
        a: "No. Our fees cover strategy, setup, creative, and ongoing management of your campaigns. Ad spend (what you pay Meta, Google, or TikTok directly) is separate and billed directly by the ad platforms so you always have full visibility and control over your budget.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We process payments securely through Creem.io, which supports all major credit cards, debit cards, and select digital payment methods.",
      },
      {
        q: "Are there any hidden fees?",
        a: "No hidden fees. The price you see during onboarding is the price you pay. Paid advertising and CRM automation are monthly retainers; funnels and websites are one-time project fees. If scope changes significantly, we'll discuss adjustments transparently before proceeding.",
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a satisfaction guarantee through our revision process for project-based work. Monthly retainers (paid advertising, CRM automation) can be paused or canceled with notice. Refund policies are outlined in our terms of service.",
      },
    ],
  },
  {
    category: "Paid Advertising & Platforms",
    questions: [
      {
        q: "What ad platforms do you run campaigns on?",
        a: "We manage campaigns on Meta (Facebook & Instagram), Google Ads (Search, Display, YouTube), and TikTok Ads. We'll recommend the right platform mix based on your audience and goals during onboarding.",
      },
      {
        q: "Do I need an existing ad account?",
        a: "No. If you don't have ad accounts set up, we'll create and configure them for you, including pixel installation, conversion tracking, and audience setup.",
      },
      {
        q: "How do you report on performance?",
        a: "You get weekly performance reports covering spend, ROAS, cost-per-lead, and pipeline impact, plus a real-time dashboard so you're never waiting on an email to know how campaigns are performing.",
      },
    ],
  },
  {
    category: "CRM & Automation",
    questions: [
      {
        q: "Do I need my own GoHighLevel account?",
        a: "Either works. We can set up and manage a GoHighLevel account for you, or connect into an existing one your team already uses. You retain full access and ownership of your account and data at all times.",
      },
      {
        q: "What does CRM automation include?",
        a: "Pipeline and opportunity tracking, automated lead follow-up sequences (email/SMS), appointment booking automation, and revenue/ROI reporting so no lead falls through the cracks.",
      },
      {
        q: "Can I upload files and assets?",
        a: "Yes. Your project page has a built-in file upload section where you can share brand assets, creative, copy documents, and any other files relevant to your campaigns and funnel.",
      },
      {
        q: "How do I communicate with the team?",
        a: "Every project includes a direct messaging feature. You can chat with our team in real-time through your dashboard — no need for external email threads or Slack channels.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-24 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <Badge variant="orange" className="mb-4">FAQ</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Frequently asked{" "}
              <span className="text-gradient-orange">questions</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about working with Legendary Marketing.
              Can&apos;t find what you&apos;re looking for? Reach out to us directly.
            </p>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4">
            <div className="space-y-12">
              {faqCategories.map((category) => (
                <div key={category.category}>
                  <h2 className="text-xl font-bold mb-4">{category.category}</h2>
                  <Accordion.Root type="single" collapsible className="space-y-2">
                    {category.questions.map((item, i) => (
                      <Accordion.Item
                        key={i}
                        value={`${category.category}-${i}`}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        <Accordion.Trigger className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer group [&[data-state=open]>svg]:rotate-180">
                          {item.q}
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                        </Accordion.Trigger>
                        <Accordion.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                          <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                            {item.a}
                          </div>
                        </Accordion.Content>
                      </Accordion.Item>
                    ))}
                  </Accordion.Root>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 bg-background">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold">Still have questions?</h2>
            <p className="mt-3 text-muted-foreground">
              We&apos;re here to help. Reach out and we&apos;ll get back to you within 24 hours.
            </p>
            <Button variant="glow" size="lg" className="mt-6" asChild>
              <Link href="/contact">
                Contact Us <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
