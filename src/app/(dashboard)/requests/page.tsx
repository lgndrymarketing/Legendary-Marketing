"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Beam } from "@/components/ui/beam-focus";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Plus } from "lucide-react";

/**
 * Requests & Feedback — the client raises support requests, feedback or new
 * ideas here, and watches the team's status on each one. Not project-scoped:
 * a retainer client has no project row and still needs to ask for things.
 */

interface Request {
  id: string;
  subject: string;
  details: string;
  status: "open" | "in_progress" | "resolved";
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Request["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STATUS_TONE: Record<Request["status"], string> = {
  open: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
};

const fmtDay = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: "", details: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/client/requests")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.requests)) setRequests(data.requests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    if (!form.subject.trim()) {
      setError("Give your request a short title.");
      return;
    }
    if (!form.details.trim()) {
      setError("Add some detail so the team knows what you need.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/client/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject.trim(),
          details: form.details.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ subject: "", details: "" });
      setSent(true);
      load();
    } catch {
      setError("Could not send that — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHero
        title="Requests & Feedback"
        description="Submit support requests, feedback, or new ideas."
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[22rem_1fr] lg:items-start">
        {/* New request */}
        <Beam>
          <form
            onSubmit={submit}
            className="rounded-xl border border-border p-5"
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-bold tracking-tight">
                New Request
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              How can we help you today?
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">
                  Subject
                </span>
                <Input
                  placeholder="Brief title"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">
                  Details
                </span>
                <textarea
                  rows={5}
                  placeholder="Please provide as much detail as possible…"
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-orange"
                  value={form.details}
                  onChange={(e) =>
                    setForm({ ...form, details: e.target.value })
                  }
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {sent && !error && (
                <p className="font-mono text-[11px] uppercase text-success">
                  Sent — the team has been notified.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                <Plus className="mr-1.5 h-4 w-4" />
                {saving ? "Sending…" : "Submit Request"}
              </Button>
            </div>
          </form>
        </Beam>

        {/* History */}
        <section>
          <div className="border-b border-border pb-3">
            <h2 className="text-[15px] font-bold tracking-tight">
              Your Requests
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              History of your submitted requests and their status.
            </p>
          </div>

          {loading ? (
            <div className="pt-4">
              <TableSkeleton rows={3} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="No requests found"
              description="Anything you send the team shows up here with its status."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="micro-label py-3 pr-4">Date</th>
                    <th className="micro-label py-3 pr-4">Subject</th>
                    <th className="micro-label py-3">Status</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={rowCascade}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border"
                >
                  {requests.map((r) => (
                    <motion.tr
                      key={r.id}
                      variants={rowItem}
                      onClick={() =>
                        setOpenId((id) => (id === r.id ? null : r.id))
                      }
                      className="cursor-pointer align-top transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {fmtDay(r.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.subject}</p>
                        {/* Click a row to read the whole thing back, plus any
                            reply the team attached. */}
                        {openId === r.id && (
                          <>
                            <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-muted-foreground">
                              {r.details}
                            </p>
                            {r.adminNotes && (
                              <p className="mt-2 border-l-2 border-orange/40 pl-3 text-[13px]">
                                <span className="micro-label block">
                                  Team reply
                                </span>
                                <span className="mt-0.5 block whitespace-pre-wrap">
                                  {r.adminNotes}
                                </span>
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
                            STATUS_TONE[r.status]
                          )}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
