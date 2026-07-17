"use client";

import { useEffect, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

type RevisionStatus = "pending" | "in_progress" | "completed" | "rejected";

interface Revision {
  id: string;
  description: string;
  status: RevisionStatus;
  adminNotes: string | null;
  createdAt: string;
}

// Same semantics as the old badge variants, rendered as uppercase mono text.
const statusClass: Record<RevisionStatus, string> = {
  pending: "text-warning",
  in_progress: "text-orange",
  completed: "text-success",
  rejected: "text-destructive",
};

const statusOptions: RevisionStatus[] = ["pending", "in_progress", "completed", "rejected"];
const statusLabels: Record<RevisionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export function RevisionManager({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  /** VAs can view revision requests but not triage them. */
  readOnly?: boolean;
}) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRevisions = useCallback(() => {
    fetch(`/api/revisions?projectId=${projectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setRevisions(data))
      .catch(() => setRevisions([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const updateStatus = async (id: string, status: RevisionStatus) => {
    setUpdating(id);
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch("/api/revisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading revisions…
      </p>
    );
  }

  if (revisions.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No revision requests"
        description="When the client requests changes, they'll show up here to triage."
      />
    );
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="space-y-2 py-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{rev.description}</p>
            <span
              className={cn(
                "shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
                statusClass[rev.status]
              )}
            >
              {statusLabels[rev.status]}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {new Date(rev.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {!readOnly && (
              <select
                className="cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-orange/40 focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-50"
                value={rev.status}
                disabled={updating === rev.id}
                onChange={(e) => updateStatus(rev.id, e.target.value as RevisionStatus)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {statusLabels[opt]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
