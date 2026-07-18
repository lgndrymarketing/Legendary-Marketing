import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui/firecrawl";
import { Plug, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { isGhlConfigured } from "@/lib/ghl";
import { GhlSyncButton } from "./ghl-sync-button";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { canManageAgency } from "@/lib/permissions";

/** Connected / Not-configured status chip — uppercase mono, semantic color. */
function StatusChip({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
        connected
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning"
      )}
    >
      {connected ? "Connected" : "Not configured"}
    </span>
  );
}

/** Masked-value pill (design.md §5 — API-key pill look). */
function MaskedPill({ label }: { label: string }) {
  return (
    <code className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground whitespace-nowrap">
      {label} ••••••••
    </code>
  );
}

export default async function AdminIntegrationsPage() {
  // Integration config is admin-only (the layout only checks isStaff).
  const staff = await getAuthenticatedUser();
  if (!canManageAgency(staff.role)) {
    redirect("/admin/campaigns");
  }

  const ghlConfigured = isGhlConfigured();
  const ablyConfigured = Boolean(process.env.ABLY_API_KEY);

  return (
    <div className="space-y-10">
      <PageHero
        title="Integrations"
        description="Connect LGNDRY to the tools that power revenue tracking and real-time client communication."
      />

      {/* GoHighLevel */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-orange" />
            <h2 className="text-[15px] font-semibold">GoHighLevel</h2>
          </div>
          <MaskedPill label="GHL" />
          <StatusChip connected={ghlConfigured} />
        </div>
        <div className="mt-4 max-w-2xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Connects the agency&apos;s GoHighLevel account so revenue and pipeline
            data (opportunities, invoices) shows up in the Payments dashboard.
            Contacts and opportunities are
            matched back to LGNDRY projects via their GHL IDs.
          </p>
          {ghlConfigured ? (
            <GhlSyncButton />
          ) : (
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1 py-0.5 font-mono">GHL_API_KEY</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">GHL_LOCATION_ID</code>, and{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">GHL_WEBHOOK_SECRET</code>{" "}
              in your environment to enable this integration.
            </p>
          )}
        </div>
      </section>

      {/* Ably */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-orange" />
            <h2 className="text-[15px] font-semibold">Ably (Real-time Messaging)</h2>
          </div>
          <MaskedPill label="ABLY" />
          <StatusChip connected={ablyConfigured} />
        </div>
        <div className="mt-4 max-w-2xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Powers instant delivery of client &lt;&gt; agency messages on top of
            the existing Messages system — the database stays the source of
            truth, Ably just pushes new messages to connected clients in
            real time.
          </p>
          {!ablyConfigured && (
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1 py-0.5 font-mono">ABLY_API_KEY</code>{" "}
              in your environment to enable real-time messaging. Without it, messages
              still send and load normally — clients just won&apos;t see live updates.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
