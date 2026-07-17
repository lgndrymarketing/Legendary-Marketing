"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshCw } from "lucide-react";

type RevisionStatus = "pending" | "in_progress" | "completed" | "rejected";

interface Revision {
  id: string;
  description: string;
  status: RevisionStatus;
  adminNotes: string | null;
  createdAt: string;
}

const statusVariant: Record<RevisionStatus, "warning" | "orange" | "success" | "destructive"> = {
  pending: "warning",
  in_progress: "orange",
  completed: "success",
  rejected: "destructive",
};

const statusOptions: RevisionStatus[] = ["pending", "in_progress", "completed", "rejected"];
const statusLabels: Record<RevisionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export function RevisionManager({ projectId }: { projectId: string }) {
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
    <div className="space-y-3">
      {revisions.map((rev) => (
        <div key={rev.id} className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{rev.description}</p>
            <Badge variant={statusVariant[rev.status]} className="shrink-0">
              {statusLabels[rev.status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {new Date(rev.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
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
          </div>
        </div>
      ))}
    </div>
  );
}
