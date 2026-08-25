"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronUp } from "lucide-react";

/**
 * Client Guides — onboarding and launch playbooks the team writes in
 * /admin/resources. Each guide expands inline below its summary.
 */

interface Guide {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
}

/** Split a guide body into sections. A blank line starts a new one, and a
 * first line ending in ":" is that section's heading. */
function sections(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((chunk) => {
      const [first, ...rest] = chunk.split("\n");
      return first.trim().endsWith(":")
        ? { heading: first.trim().replace(/:$/, ""), text: rest.join("\n") }
        : { heading: null, text: chunk };
    })
    .filter((s) => s.text.trim() || s.heading);
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/resources?kind=guide")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.resources)) setGuides(data.resources);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <PageHero
        title="Guides"
        description="Everything you need to get the most out of working with us."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No guides yet"
          description="Your team publishes onboarding and launch playbooks here."
        />
      ) : (
        <div className="space-y-6">
          {guides.map((g) => {
            const isOpen = openId === g.id;
            return (
              <section key={g.id} className="border-b border-border pb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 shrink-0 text-orange" />
                      <h2 className="text-[15px] font-bold tracking-tight">
                        {g.title}
                      </h2>
                    </div>
                    {g.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                  </div>
                  {g.body && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenId(isOpen ? null : g.id)}
                    >
                      {isOpen ? (
                        <>
                          Close
                          <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        `Read ${g.title}`
                      )}
                    </Button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && g.body && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 space-y-5 border-t border-border pt-5">
                        {sections(g.body).map((s, i) => (
                          <div key={i}>
                            {s.heading && (
                              <h3 className="text-sm font-semibold">
                                {s.heading}
                              </h3>
                            )}
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                              {s.text.trim()}
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
      )}
    </div>
  );
}
