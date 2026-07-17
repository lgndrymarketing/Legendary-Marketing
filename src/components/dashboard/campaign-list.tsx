"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Megaphone, Plus } from "lucide-react";

export type CampaignPlatform = "meta" | "google" | "tiktok" | "other";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface CampaignItem {
  id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  monthlyBudget: number | null;
  totalSpend: number;
  leadsGenerated: number;
  notes: string | null;
}

const platformLabels: Record<CampaignPlatform, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  other: "Other",
};

const statusOptions: CampaignStatus[] = ["draft", "active", "paused", "completed"];

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const statusVariant: Record<CampaignStatus, "success" | "warning" | "secondary" | "outline"> = {
  active: "success",
  paused: "warning",
  completed: "secondary",
  draft: "outline",
};

/** Format integer cents as whole dollars, e.g. 150000 -> "$1,500". */
function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

interface CampaignListProps {
  projectId: string;
  canEdit?: boolean;
}

export function CampaignList({ projectId, canEdit = false }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState<CampaignPlatform>("meta");

  const fetchCampaigns = useCallback(() => {
    fetch(`/api/campaigns?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCampaigns(data);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: newName.trim(), platform: newPlatform }),
    });
    if (res.ok) {
      const campaign = await res.json();
      setCampaigns((prev) => [campaign, ...prev]);
      setNewName("");
      setNewPlatform("meta");
      setAdding(false);
    }
  };

  const updateStatus = async (campaignId: string, status: CampaignStatus) => {
    setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status } : c)));
    await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  if (loading) {
    return <EmptyState icon={Megaphone} title="Loading campaigns..." description="" />;
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        adding ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createCampaign();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="Campaign name..."
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as CampaignPlatform)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {(Object.keys(platformLabels) as CampaignPlatform[]).map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabels[platform]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={createCampaign}
                className="text-xs font-medium text-primary-foreground bg-primary rounded px-2 py-1"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-xs text-muted-foreground px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add campaign
          </button>
        )
      )}

      {campaigns.length === 0 ? (
        !canEdit || !adding ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description={
              canEdit
                ? "Add the first one to start tracking spend and leads."
                : "Campaigns will appear here once your ads are live."
            }
          />
        ) : null
      ) : (
        campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium flex-1 min-w-[8rem]">{campaign.name}</p>
              <Badge variant="orange" className="text-[10px]">
                {platformLabels[campaign.platform]}
              </Badge>
              {canEdit ? (
                <select
                  value={campaign.status}
                  onChange={(e) => updateStatus(campaign.id, e.target.value as CampaignStatus)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge variant={statusVariant[campaign.status]} className="text-[10px]">
                  {statusLabels[campaign.status]}
                </Badge>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Monthly Budget</p>
                <p className="text-sm font-semibold">
                  {campaign.monthlyBudget !== null ? formatCents(campaign.monthlyBudget) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-sm font-semibold">{formatCents(campaign.totalSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leads Generated</p>
                <p className="text-sm font-semibold">{campaign.leadsGenerated.toLocaleString("en-US")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost / Lead</p>
                <p className="text-sm font-semibold">
                  {campaign.leadsGenerated > 0
                    ? `$${(campaign.totalSpend / campaign.leadsGenerated / 100).toFixed(2)}`
                    : "—"}
                </p>
              </div>
            </div>

            {campaign.notes && (
              <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{campaign.notes}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
