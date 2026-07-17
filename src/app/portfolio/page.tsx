"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowUpRight, TrendingUp, Megaphone, Workflow } from "lucide-react";
import { motion } from "motion/react";

const caseStudies = [
  {
    title: "Luxury Fashion Launch Funnel",
    client: "Maison Noir",
    service: "High-Converting Funnels",
    icon: TrendingUp,
    result: "3.1x ROAS on launch",
    description: "Built a paid social funnel with waitlist landing pages and automated email/SMS nurture that drove a sold-out seasonal launch for a luxury fashion brand.",
    tags: ["Funnel", "Paid Social", "Email/SMS"],
  },
  {
    title: "SaaS Demo Pipeline",
    client: "DataPulse",
    service: "Paid Advertising",
    icon: Megaphone,
    result: "3.4x ROAS in 90 days",
    description: "Launched and scaled Meta and Google Ads campaigns for a B2B SaaS analytics platform, driving qualified demo signups and lowering cost-per-lead.",
    tags: ["Paid Ads", "Google", "Meta"],
  },
  {
    title: "Lead Generation Funnel",
    client: "GrowthForge",
    service: "High-Converting Funnels",
    icon: TrendingUp,
    result: "4.5x ROAS in the first month",
    description: "Multi-step lead funnel with A/B tested landing pages, email/SMS follow-up, and CRM integration for a B2B marketing agency.",
    tags: ["Funnel", "CRM", "Email"],
  },
  {
    title: "Automated Lead Follow-Up",
    client: "HelpStream",
    service: "CRM & Automation",
    icon: Workflow,
    result: "20+ hours saved per week",
    description: "Set up GoHighLevel pipelines, automated follow-up sequences, and appointment booking so no inbound lead falls through the cracks.",
    tags: ["GoHighLevel", "Automation", "CRM"],
  },
  {
    title: "Ecommerce Ad Scaling",
    client: "CloudScale Labs",
    service: "Paid Advertising",
    icon: Megaphone,
    result: "3.2x ROAS in 60 days",
    description: "Rebuilt campaign structure and creative testing cadence across Meta and Google, scaling monthly ad spend while improving return on ad spend.",
    tags: ["Paid Ads", "Meta", "Google"],
  },
  {
    title: "Multi-Location Lead Engine",
    client: "TasteHub",
    service: "CRM & Automation",
    icon: Workflow,
    result: "$18 cost-per-lead across 200+ locations",
    description: "Ran geo-targeted lead campaigns feeding a GoHighLevel pipeline with automated follow-up and call tracking across a 200-location restaurant network.",
    tags: ["GoHighLevel", "Automation", "Local Ads"],
  },
];

const stats = [
  { value: "50+", label: "Projects Delivered" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "35+", label: "Happy Clients" },
  { value: "4.9★", label: "Average Rating" },
];

export default function PortfolioPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-24 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(41,84,229,0.12),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <Badge variant="orange" className="mb-4">Portfolio</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Results that speak{" "}
              <span className="text-gradient-orange">for themselves</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              See how we&apos;ve helped businesses like yours generate leads, grow
              pipeline, and scale ad spend profitably.
            </p>
          </div>
        </section>

        {/* Stats Band */}
        <section className="py-12 border-y border-border bg-card/50">
          <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-12 sm:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-orange sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Case Studies Grid */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {caseStudies.map((study, index) => {
                const Icon = study.icon;
                return (
                  <motion.div
                    key={study.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                  >
                    <Card className="group h-full hover:border-orange/40 transition-all duration-300">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10">
                            <Icon className="h-5 w-5 text-orange" />
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <Badge variant="secondary" className="w-fit mb-3 text-xs">
                          {study.service}
                        </Badge>

                        <h3 className="text-lg font-semibold">{study.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {study.client}
                        </p>

                        <p className="text-sm text-muted-foreground mt-3 flex-1">
                          {study.description}
                        </p>

                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm font-semibold text-orange">{study.result}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {study.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 sm:py-32 bg-background">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to be our next success story?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Let&apos;s discuss your project and create something amazing together.
            </p>
            <Button variant="glow" size="lg" className="mt-8" asChild>
              <Link href="/contact">
                Start Your Project <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
