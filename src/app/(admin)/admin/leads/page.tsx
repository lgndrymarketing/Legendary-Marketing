"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Inbox, Sparkles, BadgeCheck, Trophy } from "lucide-react";
import { serviceLabels } from "@/lib/services";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  serviceInterest: string | null;
  monthlyBudget: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  ghlContactId: string | null;
  createdAt: string;
}

const statusOptions: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

const sourceLabels: Record<string, string> = {
  contact_form: "Contact Form",
  get_started_funnel: "Get Started Funnel",
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    setUpdating(leadId);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update lead");
      }
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(null);
    }
  };

  const filtered =
    statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Inbox },
    { label: "New", value: leads.filter((l) => l.status === "new").length, icon: Sparkles },
    { label: "Qualified", value: leads.filter((l) => l.status === "qualified").length, icon: BadgeCheck },
    { label: "Converted", value: leads.filter((l) => l.status === "converted").length, icon: Trophy },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description="Leads captured from the website — contact form and get-started funnel — synced into GoHighLevel."
      />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-orange" />
            Lead Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...statusOptions] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  statusFilter === status
                    ? "border-orange/30 bg-orange/10 text-orange"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {status === "all" ? "All" : statusLabels[status]}
              </button>
            ))}
          </div>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={statusFilter === "all" ? "No leads yet" : "No leads with this status"}
              description={
                statusFilter === "all"
                  ? "Leads from the contact form and get-started funnel will land here."
                  : "Try a different status filter."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Interested In</th>
                    <th className="pb-3 font-medium">Budget</th>
                    <th className="pb-3 font-medium">Source</th>
                    <th className="pb-3 font-medium">GHL</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/50">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{lead.name}</p>
                        {lead.company && (
                          <p className="text-xs text-muted-foreground">{lead.company}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-muted-foreground">{lead.email}</p>
                        {lead.phone && (
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.serviceInterest
                          ? serviceLabels[lead.serviceInterest] ?? lead.serviceInterest
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.monthlyBudget || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                          {sourceLabels[lead.source] ?? lead.source.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={lead.ghlContactId ? "success" : "secondary"}
                          className="text-[10px] whitespace-nowrap"
                        >
                          {lead.ghlContactId ? "Synced" : "Not synced"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          value={lead.status}
                          disabled={updating === lead.id}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
