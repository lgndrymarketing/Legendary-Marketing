"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/ui/firecrawl";
import { Skeleton } from "@/components/ui/skeleton";

interface Project {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0) setSelectedProjectId(data[0].id);
        }
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHero
        title="Analytics"
        description="Track performance metrics for your launched projects."
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border">
          <EmptyState
            icon={BarChart3}
            title="No analytics yet"
            description="Analytics will appear here once you have an active project."
          />
        </div>
      ) : (
        <>
          {projects.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant={selectedProjectId === project.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          )}

          {selectedProjectId && <AnalyticsOverview projectId={selectedProjectId} />}
        </>
      )}
    </div>
  );
}
