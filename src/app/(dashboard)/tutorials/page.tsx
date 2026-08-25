"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PageHero, SegmentedTabs } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MonitorPlay, Play } from "lucide-react";

/**
 * Platform Tutorials — the video library the team curates in
 * /admin/resources, grouped into tracks.
 */

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  videoUrl: string | null;
  track: string | null;
}

const UNTRACKED = "General";

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/resources?kind=tutorial")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.resources)) setTutorials(data.resources);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Tracks in the order the team ordered the videos.
  const tracks = useMemo(() => {
    const seen: string[] = [];
    for (const t of tutorials) {
      const key = t.track || UNTRACKED;
      if (!seen.includes(key)) seen.push(key);
    }
    return seen;
  }, [tutorials]);

  const active = tab && tracks.includes(tab) ? tab : tracks[0];
  const visible = tutorials.filter((t) => (t.track || UNTRACKED) === active);

  return (
    <div className="space-y-10">
      <PageHero
        title="Platform Tutorials"
        description="Short walkthroughs of the tools you'll be using."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="No tutorials yet"
          description="Your team posts platform walkthroughs here."
        />
      ) : (
        <>
          {tracks.length > 1 && (
            <SegmentedTabs
              options={tracks}
              value={active ?? tracks[0]}
              onChange={setTab}
            />
          )}

          <motion.div
            key={active}
            variants={cascade}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((t) => {
              const CardTag = t.videoUrl ? "a" : "div";
              return (
                <motion.div key={t.id} variants={cascadeItem}>
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
                      {t.duration && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-foreground/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                          {t.duration}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-4 text-[15px] font-semibold">{t.title}</h2>
                    {t.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </CardTag>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}
