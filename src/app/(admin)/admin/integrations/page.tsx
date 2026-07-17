import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Plug, Radio } from "lucide-react";
import { isGhlConfigured } from "@/lib/ghl";
import { GhlSyncButton } from "./ghl-sync-button";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { canManageAgency } from "@/lib/permissions";

export default async function AdminIntegrationsPage() {
  // Integration config is admin-only (the layout only checks isStaff).
  const staff = await getAuthenticatedUser();
  if (!canManageAgency(staff.role)) {
    redirect("/admin/projects");
  }

  const ghlConfigured = isGhlConfigured();
  const ablyConfigured = Boolean(process.env.ABLY_API_KEY);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect Legendary Marketing to the tools that power revenue tracking and real-time client communication."
      />

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-orange" />
              GoHighLevel
            </span>
            <Badge variant={ghlConfigured ? "success" : "warning"}>
              {ghlConfigured ? "Connected" : "Not configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connects the agency&apos;s GoHighLevel account so revenue and pipeline
            data (opportunities, invoices) shows up alongside Creem checkout
            payments in the Payments dashboard. Contacts and opportunities are
            matched back to Legendary Marketing projects via their GHL IDs.
          </p>
          {ghlConfigured ? (
            <GhlSyncButton />
          ) : (
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1 py-0.5">GHL_API_KEY</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5">GHL_LOCATION_ID</code>, and{" "}
              <code className="rounded bg-muted px-1 py-0.5">GHL_WEBHOOK_SECRET</code>{" "}
              in your environment to enable this integration.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-orange" />
              Ably (Real-time Messaging)
            </span>
            <Badge variant={ablyConfigured ? "success" : "warning"}>
              {ablyConfigured ? "Connected" : "Not configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Powers instant delivery of client &lt;&gt; agency messages on top of
            the existing Messages system — the database stays the source of
            truth, Ably just pushes new messages to connected clients in
            real time.
          </p>
          {!ablyConfigured && (
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1 py-0.5">ABLY_API_KEY</code>{" "}
              in your environment to enable real-time messaging. Without it, messages
              still send and load normally — clients just won&apos;t see live updates.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
