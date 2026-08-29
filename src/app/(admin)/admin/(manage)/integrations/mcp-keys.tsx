"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bot, Check, Copy, Plus, Trash2 } from "lucide-react";

/**
 * AI Assistant Access — mint and revoke MCP keys. The plaintext key exists
 * in the browser exactly once, in the panel below the form, right after
 * creation; after that only its prefix is ever shown again.
 */

interface KeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdByName: string | null;
  createdByEmail: string;
  lastUsedAt: string | null;
  requestCount: number;
  revokedAt: string | null;
  createdAt: string;
}

const fmtDay = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "never";

export function McpKeysManager() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "url" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/mcp-keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.keys)) setKeys(data.keys);
      })
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const mcpUrl = (key: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp/${key}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name the key — e.g. \"Duke's Claude\".");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFreshKey(data.key);
      setName("");
      load();
    } catch {
      setError("Could not create the key — try again.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(k: KeyRow) {
    if (
      !window.confirm(
        `Revoke "${k.name}"? Any assistant using it loses access immediately.`
      )
    )
      return;
    await fetch(`/api/admin/mcp-keys/${k.id}`, { method: "DELETE" });
    load();
  }

  async function copy(text: string, which: "key" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <section className="border-b border-border pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">AI Assistant Access</h2>
        </div>
        <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          MCP · Read-only
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Connect Claude, ChatGPT, or any MCP-capable assistant to the agency —
        ask about clients, finances, tasks and weekly reporting in plain
        English. Keys are admin-only, read-only, and revocable here; add the
        URL below as a custom connector / remote MCP server in the assistant.
      </p>

      {/* Mint */}
      <form onSubmit={create} className="mt-5 flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder={'Key name — e.g. "Duke\'s Claude"'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={creating}>
          <Plus className="mr-1.5 h-4 w-4" />
          {creating ? "Creating…" : "Create Key"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {/* The one moment the plaintext exists on screen */}
      {freshKey && (
        <div className="mt-4 max-w-2xl rounded-xl border border-orange/30 bg-accent/40 p-4">
          <p className="text-sm font-semibold">
            Copy this now — it will never be shown again.
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs">
                {mcpUrl(freshKey)}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copy(mcpUrl(freshKey), "url")}
              >
                {copied === "url" ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1.5">Server URL</span>
              </Button>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Paste the URL as the MCP server address in Claude (Settings →
              Connectors → Add custom connector) or ChatGPT (Settings →
              Connectors). Treat it like a password — anyone with the URL can
              read agency data until the key is revoked.
            </p>
          </div>
        </div>
      )}

      {/* Existing keys */}
      {keys.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full max-w-3xl text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="micro-label py-2.5 pr-4">Name</th>
                <th className="micro-label py-2.5 pr-4">Key</th>
                <th className="micro-label py-2.5 pr-4">Created By</th>
                <th className="micro-label py-2.5 pr-4">Last Used</th>
                <th className="micro-label py-2.5 pr-4 text-right">Requests</th>
                <th className="micro-label py-2.5 pr-4">Status</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => (
                <tr key={k.id} className={cn(k.revokedAt && "opacity-50")}>
                  <td className="py-2.5 pr-4 font-medium">{k.name}</td>
                  <td className="py-2.5 pr-4">
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {k.keyPrefix}…
                    </code>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {k.createdByName || k.createdByEmail}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                    {fmtDay(k.lastUsedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs">
                    {k.requestCount.toLocaleString("en-US")}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                        k.revokedAt
                          ? "bg-muted text-muted-foreground"
                          : "bg-success/10 text-success"
                      )}
                    >
                      {k.revokedAt ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {!k.revokedAt && (
                      <button
                        onClick={() => revoke(k)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        aria-label={`Revoke ${k.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
