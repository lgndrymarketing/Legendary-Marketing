"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PageHero, SegmentedTabs } from "@/components/ui/firecrawl";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Play, MonitorPlay } from "lucide-react";

/**
 * Platform Tutorials — LGNDRY Launchpad (getting started) and LGNDRY
 * University (deeper training). Static config the agency curates in code;
 * cards with a videoUrl open it in a new tab, the rest read "coming soon".
 */

interface Tutorial {
  title: string;
  description: string;
  duration: string;
  /** External video link (Loom/YouTube). Null = placeholder card. */
  videoUrl: string | null;
}

const TRACKS: Record<string, Tutorial[]> = {
  "LGNDRY Launchpad": [
    {
      title: "Welcome & How it works",
      description: "Overview of the landing page and our qualification process.",
      duration: "4:15",
      videoUrl: null,
    },
    {
      title: "How the CRM works",
      description: "A quick tour of the CRM system and its main features.",
      duration: "6:30",
      videoUrl: null,
    },
    {
      title: "Ad Account Access",
      description: "How to create and give us access to your Facebook Ads account.",
      duration: "5:45",
      videoUrl: null,
    },
  ],
  "LGNDRY University": [
    {
      title: "Speed to Lead",
      description: "Why calling within 5 minutes doubles your close rate.",
      duration: "7:20",
      videoUrl: null,
    },
    {
      title: "Working the Pipeline",
      description: "Moving leads through follow-up stages without dropping any.",
      duration: "8:05",
      videoUrl: null,
    },
    {
      title: "Reading Your Weekly Report",
      description: "Turning leads, CPL, and ROAS into decisions that grow revenue.",
      duration: "5:10",
      videoUrl: null,
    },
  ],
};

const TABS = Object.keys(TRACKS);

export default function TutorialsPage() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="space-y-8">
      <PageHero
        title="Platform Tutorials"
        description="Learn how to make the most out of your client portal."
      />

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

      <motion.div
        key={tab}
        variants={cascade}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TRACKS[tab].map((t) => {
          const CardTag = t.videoUrl ? "a" : "div";
          return (
            <motion.div key={t.title} variants={cascadeItem}>
              <CardTag
                {...(t.videoUrl
                  ? {
                      href: t.videoUrl,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {})}
                className={cn(
                  "group block border-t border-border pt-5",
                  t.videoUrl && "cursor-pointer"
                )}
              >
                {/* Thumbnail band — dotted texture with a play badge */}
                <div className="dot-texture relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-sidebar">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-background/90 shadow-sm transition-transform",
                      t.videoUrl && "group-hover:scale-110"
                    )}
                  >
                    <Play className="ml-0.5 h-5 w-5 text-orange" />
                  </span>
                  <span className="absolute bottom-2 right-2 rounded-md bg-foreground/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                    {t.duration}
                  </span>
                </div>
                <h2 className="mt-4 text-[15px] font-semibold">{t.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </p>
                {!t.videoUrl && (
                  <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <MonitorPlay className="h-3.5 w-3.5" />
                    Video coming soon
                  </p>
                )}
              </CardTag>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
