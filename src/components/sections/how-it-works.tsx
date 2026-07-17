"use client";

import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CreditCard, BarChart3, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Onboard & Strategize",
    description:
      "Select your service, create your account, and walk through a quick onboarding form covering your offer, audience, and goals. We build your media and funnel strategy from there.",
  },
  {
    icon: CreditCard,
    title: "Ad Account & Setup",
    description:
      "We configure your ad accounts, pixels, tracking, and GoHighLevel pipeline. Transparent pricing from the start — no hidden fees.",
  },
  {
    icon: BarChart3,
    title: "Build & Launch Campaigns",
    description:
      "Watch your funnel and campaigns move through each phase in real-time with our DoorDash-style tracker. Always know where things stand.",
  },
  {
    icon: MessageSquare,
    title: "Optimize & Scale",
    description:
      "We monitor performance daily, report weekly, and continuously test creative and targeting to lower cost-per-lead and scale what's working.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="orange" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            From idea to{" "}
            <span className="text-gradient-orange">launch</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A simple, transparent process that keeps you in the loop every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange/10 border border-orange/20">
                  <Icon className="h-7 w-7 text-orange" />
                </div>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
