"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BracketLabel, MetricRing } from "@/components/ui/firecrawl";
import { PhaseTracker, type Phase } from "@/components/dashboard/phase-tracker";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CampaignList } from "@/components/dashboard/campaign-list";
import { RevisionManager } from "./revision-manager";
import { cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  SkipForward,
  KanbanSquare,
  Megaphone,
  RefreshCw,
} from "lucide-react";

// Same semantics as the old badge variants, rendered as uppercase mono text.
const statusClass: Record<string, string> = {
  onboarding: "text-muted-foreground",
  payment_pending: "text-warning",
  in_progress: "text-orange",
  revision: "text-warning",
  completed: "text-success",
  cancelled: "text-muted-foreground",
};

const phaseStatusOptions: Phase["status"][] = [
  "pending",
  "in_progress",
  "completed",
];

const phaseStatusLabels: Record<Phase["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

interface OnboardingData {
  businessName: string;
  industry: string | null;
  description: string | null;
  budget: string | null;
  timeline: string | null;
}

interface ManageClientProps {
  /** admin/PM: full management controls. VA: read + own-task updates only. */
  canManage: boolean;
  projectId: string;
  projectName: string;
  status: string;
  statusLabel: string;
  serviceLabel: string;
  clientName: string;
  clientEmail: string;
  phases: Phase[];
  onboarding: OnboardingData | null;
}

export function ManageClient({
  canManage,
  projectId,
  projectName,
  status,
  statusLabel,
  serviceLabel,
  clientName,
  clientEmail,
  phases: initialPhases,
  onboarding,
}: ManageClientProps) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [advancing, setAdvancing] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [msgStatus, setMsgStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const allDone =
    phases.length > 0 && phases.every((p) => p.status === "completed");
  const completedCount = phases.filter((p) => p.status === "completed").length;

  const patchPhase = async (
    phaseId: string,
    phaseStatus: Phase["status"]
  ): Promise<boolean> => {
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, status: phaseStatus }),
    });
    return res.ok;
  };

  const applyLocal = (updates: { id: string; status: Phase["status"] }[]) => {
    setPhases((prev) =>
      prev.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, status: u.status } : p;
      })
    );
  };

  // Advance = complete the current in_progress phase and start the next pending
  // one. If nothing is in progress yet, just start the earliest pending phase.
  const advancePhase = async () => {
    setPhaseError(null);
    setAdvancing(true);
    try {
      const sorted = [...phases].sort((a, b) => a.order - b.order);
      const inProgress = sorted.find((p) => p.status === "in_progress");
      const nextPending = sorted.find((p) => p.status === "pending");

      const updates: { id: string; status: Phase["status"] }[] = [];
      if (inProgress) updates.push({ id: inProgress.id, status: "completed" });
      if (nextPending) updates.push({ id: nextPending.id, status: "in_progress" });
      if (updates.length === 0) return;

      for (const u of updates) {
        const ok = await patchPhase(u.id, u.status);
        if (!ok) throw new Error("Failed to update phase");
      }
      applyLocal(updates);
    } catch {
      setPhaseError("Could not advance the phase. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const setPhaseStatus = async (phaseId: string, next: Phase["status"]) => {
    setPhaseError(null);
    const ok = await patchPhase(phaseId, next);
    if (ok) {
      applyLocal([{ id: phaseId, status: next }]);
    } else {
      setPhaseError("Could not update that phase. Please try again.");
    }
  };

  const sendMessage = async () => {
    const content = message.trim();
    if (!content) return;
    setSending(true);
    setMsgStatus(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }
      setMessage("");
      setMsgStatus({ ok: true, text: "Message sent to the client." });
    } catch (err) {
      setMsgStatus({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  };

  const selectClass =
    "cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-orange/40 focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-10">
      {/* Header — back arrow + oversized title, closed by a hairline */}
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Link
          href="/admin/campaigns"
          aria-label="Back to campaigns"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-orange/40 hover:bg-orange/5 hover:text-orange active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {projectName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Client: {clientName} &middot; {serviceLabel}
          </p>
        </div>
        <span
          className={cn(
            "font-mono text-xs font-semibold uppercase tracking-wide whitespace-nowrap",
            statusClass[status] ?? "text-muted-foreground"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left: Phase management, tasks, campaigns, messaging */}
        <motion.div
          variants={cascade}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 space-y-10"
        >
          {/* Phases */}
          <motion.section
            variants={cascadeItem}
            className="border-b border-border pb-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <BracketLabel
                  n={completedCount}
                  m={phases.length}
                  label="PHASES"
                />
                <h2 className="text-[15px] font-semibold">
                  {canManage ? "Phase Management" : "Phases"}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <MetricRing
                  value={completedCount}
                  max={phases.length}
                  label={`of ${phases.length} complete`}
                />
                {canManage && (
                  <Button
                    onClick={advancePhase}
                    disabled={advancing || allDone || phases.length === 0}
                    size="sm"
                  >
                    <SkipForward className="mr-1 h-4 w-4" />
                    {advancing ? "Advancing..." : "Advance Phase"}
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-6 space-y-6">
              {phaseError && (
                <p className="text-sm text-destructive">{phaseError}</p>
              )}
              {phases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No phases have been set up for this project yet.
                </p>
              ) : (
                <>
                  <PhaseTracker phases={phases} />
                  {canManage && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <p className="micro-label">Set phase status</p>
                      {[...phases]
                        .sort((a, b) => a.order - b.order)
                        .map((phase) => (
                          <div
                            key={phase.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-sm truncate">{phase.name}</span>
                            <select
                              className={selectClass}
                              value={phase.status}
                              onChange={(e) =>
                                setPhaseStatus(
                                  phase.id,
                                  e.target.value as Phase["status"]
                                )
                              }
                            >
                              {phaseStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {phaseStatusLabels[opt]}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.section>

          {/* Task board */}
          <motion.section
            variants={cascadeItem}
            className="border-b border-border pb-8"
          >
            <div className="flex items-center gap-2 pb-4">
              <KanbanSquare className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">Task Board</h2>
            </div>
            <KanbanBoard projectId={projectId} />
          </motion.section>

          {/* Ad campaigns */}
          <motion.section
            variants={cascadeItem}
            className="border-b border-border pb-8"
          >
            <div className="flex items-center gap-2 pb-4">
              <Megaphone className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">Ad Campaigns</h2>
            </div>
            <CampaignList projectId={projectId} canEdit={canManage} />
          </motion.section>

          {/* Revision requests */}
          <motion.section
            variants={cascadeItem}
            className="border-b border-border pb-8"
          >
            <div className="flex items-center gap-2 pb-4">
              <RefreshCw className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">Revision Requests</h2>
            </div>
            <RevisionManager projectId={projectId} readOnly={!canManage} />
          </motion.section>

          {/* Admin message to client */}
          <motion.section variants={cascadeItem}>
            <div className="flex items-center gap-2 pb-4">
              <MessageSquare className="h-4 w-4 text-orange" />
              <h2 className="text-[15px] font-semibold">Message Client</h2>
            </div>
            <div className="space-y-4">
              <Textarea
                placeholder="Send a message to the client..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              {msgStatus && (
                <p
                  className={
                    msgStatus.ok
                      ? "text-sm text-success"
                      : "text-sm text-destructive"
                  }
                >
                  {msgStatus.text}
                </p>
              )}
              <Button disabled={!message.trim() || sending} onClick={sendMessage}>
                <Send className="mr-1 h-4 w-4" />
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </motion.section>
        </motion.div>

        {/* Right: Client info & onboarding */}
        <motion.div
          variants={cascade}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          <motion.section variants={cascadeItem}>
            <p className="micro-label border-b border-border pb-3">
              Client Details
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Name</span>
                <span className="text-right">{clientName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="text-right break-all">{clientEmail}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Service</span>
                <span className="text-right">{serviceLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold uppercase tracking-wide",
                    statusClass[status] ?? "text-muted-foreground"
                  )}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </motion.section>

          <motion.section variants={cascadeItem}>
            <p className="micro-label border-b border-border pb-3">
              Onboarding Data
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {onboarding ? (
                <>
                  <div>
                    <span className="text-muted-foreground block mb-1">Business</span>
                    <span>{onboarding.businessName}</span>
                  </div>
                  {onboarding.industry && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Industry
                      </span>
                      <span>{onboarding.industry}</span>
                    </div>
                  )}
                  {onboarding.budget && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Budget</span>
                      <span>{onboarding.budget}</span>
                    </div>
                  )}
                  {onboarding.timeline && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Timeline
                      </span>
                      <span>{onboarding.timeline}</span>
                    </div>
                  )}
                  {onboarding.description && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Description
                      </span>
                      <p className="text-muted-foreground">
                        {onboarding.description}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  No onboarding submission on file yet.
                </p>
              )}
            </div>
          </motion.section>

          <motion.section variants={cascadeItem}>
            <p className="micro-label border-b border-border pb-3">
              Client Files
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Files coming from the client portal.
            </p>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
