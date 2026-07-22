"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Rocket,
  FileText,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

/**
 * Client Guides — onboarding and launch playbooks. Static content the agency
 * curates in code; each guide expands inline below its summary card.
 */

interface GuideSection {
  heading: string;
  body: string;
}

interface Guide {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  sections: GuideSection[];
}

const GUIDES: Guide[] = [
  {
    key: "onboarding",
    icon: BookOpen,
    title: "Onboarding Guide",
    description:
      "Step-by-step instructions on what to expect during your first 14 days with us.",
    bullets: [
      "How to grant us access to your CRM",
      "Setting up your A2P registration",
      "Completing the onboarding form",
      "What happens during the kickoff call",
    ],
    cta: "Read Onboarding Guide",
    sections: [
      {
        heading: "1 · Complete the onboarding form",
        body: "Right after signup you'll receive our onboarding form. It captures your business details, offer, target market, and brand assets. The sooner it's in, the sooner our team starts your build — this is the first step of your launch pipeline.",
      },
      {
        heading: "2 · Grant us access to your CRM",
        body: "Your CSM will send an invite link for your CRM workspace. Accept it and we'll configure your pipelines, calendars, and automations. You keep full ownership — we work inside your account.",
      },
      {
        heading: "3 · Set up your A2P registration",
        body: "US carriers require A2P 10DLC registration before we can send texts on your behalf. We submit it for you — you just approve the registration details we prepare. Carrier review usually takes a few business days, and we track it as its own pipeline stage so you always know where it stands.",
      },
      {
        heading: "4 · The kickoff call",
        body: "Once access is in place, your CSM books the kickoff call. We walk your funnel plan, confirm your offer and targeting, and set expectations for the build weeks. After the call you can watch every step move across the pipeline on your Project page.",
      },
    ],
  },
  {
    key: "launch",
    icon: Rocket,
    title: "Launch Guide",
    description:
      "Everything you need to know about our ad launch process and how to handle leads.",
    bullets: [
      "Reviewing ad creatives",
      "Understanding the launch timeline",
      "How to track your leads in the dashboard",
      "Best practices for closing leads",
    ],
    cta: "Read Launch Guide",
    sections: [
      {
        heading: "1 · Review your ad creatives",
        body: "Before anything goes live, we share the ad creatives for your approval. Give feedback fast — creative approval is the gate between the build stages and the launch stages of your pipeline.",
      },
      {
        heading: "2 · The launch timeline",
        body: "After your launch form is in and the launch call is done, we build the ads campaign and set it live. Expect the first leads within days of launch; the first two weeks are a calibration window while the algorithm learns.",
      },
      {
        heading: "3 · Track your leads in the dashboard",
        body: "Every week we post your leads and cost per lead to your Weekly Report page, and your dashboard charts leads, CPL, and ROAS over time. Add your closes and revenue each week so the numbers show your true return.",
      },
      {
        heading: "4 · Close like the best clients do",
        body: "Speed to lead wins: call new leads within five minutes, follow up at least five times, and let the CRM automations keep no-shows warm. Your CSM reviews close rates with you and tunes targeting from what your sales data says.",
      },
    ],
  },
];

export default function GuidesPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <PageHero
        title="Client Guides"
        description="Everything you need to know to get the most out of our partnership."
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {GUIDES.map((guide) => {
          const isOpen = open === guide.key;
          return (
            <section key={guide.key} className="border-t border-border pt-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                <guide.icon className="h-5 w-5 text-orange" />
              </span>
              <h2 className="mt-4 text-xl font-bold tracking-tight">
                {guide.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {guide.description}
              </p>
              <ul className="mt-4 space-y-2">
                {guide.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                onClick={() => setOpen(isOpen ? null : guide.key)}
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronUp className="mr-1.5 h-4 w-4" />
                ) : (
                  <FileText className="mr-1.5 h-4 w-4" />
                )}
                {isOpen ? "Close Guide" : guide.cta}
              </Button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 space-y-5 border-t border-border pt-5">
                      {guide.sections.map((s) => (
                        <div key={s.heading}>
                          <h3
                            className={cn(
                              "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-orange"
                            )}
                          >
                            {s.heading}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {s.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </div>
  );
}
