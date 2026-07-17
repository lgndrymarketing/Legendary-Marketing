"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PhaseTracker, type Phase } from "@/components/dashboard/phase-tracker";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CampaignList } from "@/components/dashboard/campaign-list";
import { RevisionManager } from "./revision-manager";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  SkipForward,
  KanbanSquare,
  Megaphone,
  RefreshCw,
} from "lucide-react";

const statusVariant: Record<string, "success" | "warning" | "orange" | "secondary"> = {
  onboarding: "secondary",
  payment_pending: "warning",
  in_progress: "orange",
  revision: "warning",
  completed: "success",
  cancelled: "secondary",
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{projectName}</h1>
          <p className="text-muted-foreground">
            Client: {clientName} &middot; {serviceLabel}
          </p>
        </div>
        <Badge
          variant={statusVariant[status] ?? "secondary"}
          className="text-sm px-3 py-1"
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Phase management, tasks, campaigns, messaging */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{canManage ? "Phase Management" : "Phases"}</CardTitle>
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
            </CardHeader>
            <CardContent className="space-y-6">
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
                    <p className="text-xs font-medium text-muted-foreground">
                      Set phase status
                    </p>
                    {[...phases]
                      .sort((a, b) => a.order - b.order)
                      .map((phase) => (
                        <div
                          key={phase.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-sm truncate">{phase.name}</span>
                          <select
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
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
            </CardContent>
          </Card>

          {/* Task board */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KanbanSquare className="h-5 w-5 text-orange" />
                Task Board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KanbanBoard projectId={projectId} />
            </CardContent>
          </Card>

          {/* Ad campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-orange" />
                Ad Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignList projectId={projectId} canEdit={canManage} />
            </CardContent>
          </Card>

          {/* Revision requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange" />
                Revision Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevisionManager projectId={projectId} readOnly={!canManage} />
            </CardContent>
          </Card>

          {/* Admin message to client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange" />
                Message Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Right: Client info & onboarding */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
                <Badge
                  variant={statusVariant[status] ?? "secondary"}
                  className="text-xs"
                >
                  {statusLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Files</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Files coming from the client portal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
