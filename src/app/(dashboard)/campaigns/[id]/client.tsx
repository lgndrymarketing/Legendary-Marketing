"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhaseTracker, type Phase } from "@/components/dashboard/phase-tracker";
import { FilePreviewCard } from "@/components/dashboard/file-preview";
import { ProjectComments } from "@/components/dashboard/project-comments";
import { NPSSurvey } from "@/components/dashboard/nps-survey";
import { InvoiceCard } from "@/components/dashboard/invoice-card";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { CampaignList } from "@/components/dashboard/campaign-list";
import { BracketLabel, MetricRing } from "@/components/ui/firecrawl";
import { UploadDropzone } from "@/lib/uploadthing";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Send,
  RotateCcw,
  BarChart3,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  status: "paid" | "pending" | "overdue";
  items: { description: string; amount: string }[];
  subtotal: string;
  tax: string;
  total: string;
  projectName: string;
  clientName: string;
}

interface ProjectDetailClientProps {
  project: {
    id: string;
    name: string;
    serviceType: string;
    status: string;
    createdAt: string;
  };
  phases: Phase[];
  files: { name: string; url: string; size: string; type: string }[];
  invoice: InvoiceData | null;
  showSurvey: boolean;
}

const tabItems = [
  { value: "progress", label: "Progress", icon: RotateCcw },
  { value: "comments", label: "Comments", icon: MessageCircle },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
];

type FileItem = { name: string; url: string; size: string; type: string };

type RevisionStatus = "pending" | "in_progress" | "completed" | "rejected";

interface Revision {
  id: string;
  description: string;
  status: RevisionStatus;
  adminNotes: string | null;
  createdAt: string;
}

/** Revision status → uppercase-mono text color (design.md §2.1 semantics). */
const revisionStatusTone: Record<RevisionStatus, string> = {
  pending: "text-warning",
  in_progress: "text-orange",
  completed: "text-success",
  rejected: "text-destructive",
};

const revisionStatusLabels: Record<RevisionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

/** Project status → uppercase-mono text color. */
const projectStatusTone: Record<string, string> = {
  onboarding: "text-muted-foreground",
  payment_pending: "text-warning",
  in_progress: "text-orange",
  revision: "text-warning",
  completed: "text-success",
  cancelled: "text-destructive",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDetailClient({
  project,
  phases,
  files,
  invoice,
  showSurvey: initialShowSurvey,
}: ProjectDetailClientProps) {
  const [revisionText, setRevisionText] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showSurvey, setShowSurvey] = useState(initialShowSurvey);
  // Files start from the server-rendered prop and grow as uploads complete.
  const [fileList, setFileList] = useState<FileItem[]>(files);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchRevisions = useCallback(() => {
    fetch(`/api/revisions?projectId=${project.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setRevisions(data))
      .catch(() => setRevisions([]));
  }, [project.id]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleSubmitRevision = async () => {
    if (!revisionText.trim()) return;
    setSubmittingRevision(true);
    setRevisionError(null);
    try {
      const res = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          description: revisionText,
        }),
      });
      if (res.ok) {
        setRevisionText("");
        fetchRevisions();
      } else {
        setRevisionError("Couldn't submit your request. Please try again.");
      }
    } catch {
      setRevisionError("Couldn't submit your request. Please try again.");
    } finally {
      setSubmittingRevision(false);
    }
  };

  const completedPhases = phases.filter((p) => p.status === "completed").length;

  return (
    <div className="space-y-8">
      {/* Header — back arrow, big title, uppercase mono status */}
      <div className="relative border-b border-border pb-8">
        <div
          className="dot-texture pointer-events-none absolute inset-y-0 right-0 hidden w-64 sm:block"
          style={{
            maskImage: "linear-gradient(to left, black, transparent)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent)",
          }}
        />
        <div className="relative">
          <Link
            href="/campaigns"
            className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="micro-label">Campaigns</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {project.name}
              </h1>
              <p className="mt-2 text-muted-foreground">{project.serviceType}</p>
            </div>
            <span
              className={cn(
                "font-mono text-xs font-semibold uppercase tracking-[0.08em]",
                projectStatusTone[project.status] || "text-orange"
              )}
            >
              {project.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* NPS Survey */}
      {showSurvey && (
        <NPSSurvey
          projectId={project.id}
          projectName={project.name}
          onDismiss={() => setShowSurvey(false)}
        />
      )}

      {/* Tabbed content */}
      <Tabs.Root defaultValue="progress">
        <Tabs.List className="mb-6 inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-[13px] transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* Progress tab */}
        <Tabs.Content value="progress">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              {/* Build Progress */}
              <section className="border-t border-border pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <BracketLabel
                    n={completedPhases}
                    m={phases.length}
                    label="Build Progress"
                  />
                  {phases.length > 0 && (
                    <MetricRing
                      value={completedPhases}
                      max={phases.length}
                      size={48}
                      label={`of ${phases.length} phases complete`}
                    />
                  )}
                </div>
                <div className="mt-6">
                  {phases.length > 0 ? (
                    <PhaseTracker phases={phases} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Phases will appear here once your project kicks off.
                    </p>
                  )}
                </div>
              </section>

              {/* Ad Campaigns */}
              <section className="border-t border-border pt-5">
                <h3 className="micro-label">Ad Campaigns</h3>
                <div className="mt-4">
                  <CampaignList projectId={project.id} canEdit={false} />
                </div>
              </section>

              {/* Revision Request */}
              <section className="space-y-4 border-t border-border pt-5">
                <h3 className="micro-label">Request a Revision</h3>
                <Textarea
                  placeholder="Describe what you'd like changed..."
                  rows={3}
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                />
                <Button
                  disabled={!revisionText.trim() || submittingRevision}
                  onClick={handleSubmitRevision}
                >
                  <Send className="mr-1 h-4 w-4" />
                  {submittingRevision ? "Submitting..." : "Submit Revision Request"}
                </Button>

                {revisionError && (
                  <p className="text-sm text-destructive">{revisionError}</p>
                )}

                {revisions.length > 0 && (
                  <div className="divide-y divide-border border-t border-border">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="space-y-1.5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm">{rev.description}</p>
                          <span
                            className={cn(
                              "shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
                              revisionStatusTone[rev.status]
                            )}
                          >
                            {revisionStatusLabels[rev.status]}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {rev.adminNotes && (
                          <p className="text-sm text-muted-foreground">
                            Response from the team: {rev.adminNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right sidebar */}
            <div className="space-y-8">
              {/* Files */}
              <section className="space-y-4 border-t border-border pt-5">
                <h3 className="micro-label">Files</h3>
                <UploadDropzone
                  endpoint="projectFile"
                  input={{ projectId: project.id }}
                  onBeforeUploadBegin={(uploadFiles) => {
                    setUploadError(null);
                    return uploadFiles;
                  }}
                  onClientUploadComplete={async (res) => {
                    // Record each uploaded file in our DB via /api/files,
                    // then reflect it in the list. Recording is the source of
                    // truth; optimistic UI append keeps the view in sync.
                    const recorded: FileItem[] = [];
                    for (const upload of res) {
                      try {
                        const apiRes = await fetch("/api/files", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            projectId: project.id,
                            name: upload.name,
                            url: upload.ufsUrl,
                            size: upload.size,
                            type: upload.type || undefined,
                          }),
                        });
                        if (apiRes.ok) {
                          recorded.push({
                            name: upload.name,
                            url: upload.ufsUrl,
                            size: formatBytes(upload.size),
                            type: upload.type || "application/octet-stream",
                          });
                        }
                      } catch {
                        // Ignore a single failed record; others still apply.
                      }
                    }
                    if (recorded.length > 0) {
                      setFileList((prev) => [...prev, ...recorded]);
                    }
                  }}
                  onUploadError={(error) => {
                    setUploadError(error.message);
                  }}
                  className="ut-button:bg-orange ut-button:text-white ut-label:text-orange ut-upload-icon:text-muted-foreground rounded-lg border-2 border-dashed border-border p-6"
                />

                {uploadError && (
                  <p className="text-sm text-destructive text-center">
                    {uploadError}
                  </p>
                )}

                {fileList.length > 0 ? (
                  <div className="space-y-2">
                    {fileList.map((file) => (
                      <FilePreviewCard
                        key={file.url}
                        name={file.name}
                        url={file.url}
                        type={file.type}
                        size={file.size}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No files uploaded yet.
                  </p>
                )}
              </section>

              {/* Invoice */}
              {invoice && <InvoiceCard invoice={invoice} />}

              {/* Project Info */}
              <section className="border-t border-border pt-5">
                <h3 className="micro-label">Campaign Details</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span>{project.serviceType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={cn(
                        "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
                        projectStatusTone[project.status] || "text-orange"
                      )}
                    >
                      {project.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-mono text-xs">{project.createdAt}</span>
                  </div>
                  {invoice && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Payment</span>
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
                          invoice.status === "paid"
                            ? "text-success"
                            : "text-warning"
                        )}
                      >
                        {invoice.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </Tabs.Content>

        {/* Comments tab */}
        <Tabs.Content value="comments">
          <section className="border-t border-border pt-5">
            <h3 className="micro-label">Comments</h3>
            <div className="mt-4">
              <ProjectComments projectId={project.id} />
            </div>
          </section>
        </Tabs.Content>

        {/* Analytics tab */}
        <Tabs.Content value="analytics">
          <AnalyticsOverview projectId={project.id} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
