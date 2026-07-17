"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Logo } from "@/components/ui/logo";
import { ArrowDown, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(41,84,229,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(201,151,44,0.08),transparent_50%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,21,26,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(20,21,26,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          <Logo size={72} />

          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 text-xs font-medium text-orange">
            <TrendingUp className="h-3.5 w-3.5" />
            Paid Ads &amp; Funnels for Growth Brands
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
            Performance Marketing{" "}
            <span className="text-gradient-orange">Built to Convert</span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            We plan the media buy, build the funnel, and manage the pipeline —
            then hand you a live dashboard to track every lead, every dollar,
            and every phase of the work in real time.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <RainbowButton className="h-14 px-10 text-base rounded-xl" asChild>
              <Link href="/services">
                See Our Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </RainbowButton>
            <Button variant="outline" size="lg" asChild>
              <Link href="/sign-in">Client Login</Link>
            </Button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-16"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowDown className="mx-auto h-6 w-6" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
