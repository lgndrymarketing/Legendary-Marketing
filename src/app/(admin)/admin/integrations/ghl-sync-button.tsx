"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncResult {
  configured: boolean;
  message?: string;
  synced?: number;
  errors?: string[];
}

export function GhlSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/ghl/sync", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ configured: true, errors: ["Sync request failed. Please try again."] });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleSync} disabled={syncing} size="sm">
        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>

      {result && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          {result.message && <p>{result.message}</p>}
          {typeof result.synced === "number" && (
            <p>
              Synced <span className="font-semibold">{result.synced}</span> opportunities.
            </p>
          )}
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
