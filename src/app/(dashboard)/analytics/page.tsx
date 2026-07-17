"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Analytics"
        description="Track performance metrics for your launched projects."
      />

      {loading ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No analytics yet"
            description="Analytics will appear here once you have an active project."
          />
        </Card>
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
