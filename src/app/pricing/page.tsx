"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { services } from "@/lib/services";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const projectServices = services.filter(
  (s) => s.id === "funnel_build" || s.id === "website_design"
);
const retainerServices = services.filter(
  (s) => s.id === "paid_advertising" || s.id === "crm_automation"
);

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-24 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,74,0,0.12),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <Badge variant="orange" className="mb-4">Pricing</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Transparent pricing,{" "}
              <span className="text-gradient-orange">no surprises</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Paid advertising and CRM automation are ongoing monthly retainers.
              Funnels and websites are one-time project builds. Ad spend is
              always billed separately and stays under your control.
            </p>
          </div>
        </section>

        {/* Monthly Retainers */}
        <section className="py-16 sm:py-20 -mt-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-2">Monthly Retainers</h2>
            <p className="text-center text-muted-foreground mb-10">
              Ongoing management for campaigns and pipelines that need constant optimization.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto">
              {retainerServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card
                    className={cn(
                      "relative h-full flex flex-col",
                      service.id === "paid_advertising" && "border-orange shadow-lg shadow-orange-glow/10"
                    )}
                  >
                    {service.id === "paid_advertising" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="bg-orange text-white">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{service.startingPrice.replace("Starting at ", "")}</span>
                      </div>
                      <CardDescription className="mt-2">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 flex-1">
                        {service.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-orange" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={service.id === "paid_advertising" ? "glow" : "outline"}
                        className="w-full mt-8"
                        asChild
                      >
                        <Link href={`/sign-up?service=${service.id}`}>
                          Get Started
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Project-Based Services */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-2">Project-Based Builds</h2>
            <p className="text-center text-muted-foreground mb-10">
              One-time builds for funnels and websites that support your campaigns.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto">
              {projectServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{service.startingPrice.replace("Starting at ", "")}</span>
                        <span className="text-muted-foreground text-sm ml-1">/ project</span>
                      </div>
                      <CardDescription className="mt-2">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 flex-1">
                        {service.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-orange" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" className="w-full mt-8" asChild>
                        <Link href={`/sign-up?service=${service.id}`}>
                          Get Started
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ CTA */}
        <section className="py-16 sm:py-20 bg-background">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold">Have questions about pricing?</h2>
            <p className="mt-3 text-muted-foreground">
              Check our FAQ or reach out — we&apos;re happy to help you find the right plan.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <Link href="/faq">View FAQ</Link>
              </Button>
              <Button variant="glow" asChild>
                <Link href="/contact">Talk to Us <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
