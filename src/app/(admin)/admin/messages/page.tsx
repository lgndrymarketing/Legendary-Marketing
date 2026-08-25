"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHero } from "@/components/ui/firecrawl";
import { SearchPill } from "@/components/ui/filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolling } from "@/hooks/use-polling";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import { cn } from "@/lib/utils";
import { MessageSquare, Send } from "lucide-react";

/**
 * Client messages — one thread per roster client. Replaces the project-scoped
 * inbox, which listed projects: nearly every client is on a retainer with no
 * project row, so their thread never appeared.
 */

interface Thread {
  id: string;
  companyName: string;
  contactName: string;
  status: string;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

interface Message {
  id: string;
  content: string;
  role: "client" | "admin";
  senderId: string;
  createdAt: string;
}

const fmtWhen = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(() => {
    fetch("/api/admin/messages")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.threads)) setThreads(data.threads);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadThread = useCallback((clientId: string) => {
    fetch(`/api/admin/messages?clientId=${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  useEffect(loadThreads, [loadThreads]);

  // Deep link from a "new message" notification: /admin/messages?client=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const client = params.get("client");
    if (!client) return;
    setActiveId(client);
    params.delete("client");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
  }, []);
  useCrmRealtime(loadThreads);

  useEffect(() => {
    if (activeId) loadThread(activeId);
    else setMessages([]);
  }, [activeId, loadThread]);

  // Keep the open thread live without an Ably channel per client.
  usePolling<{ messages?: Message[] }>({
    url: activeId ? `/api/admin/messages?clientId=${activeId}` : "",
    enabled: !!activeId,
    interval: 10000,
    onUpdate: (data) => {
      if (data && Array.isArray(data.messages)) setMessages(data.messages);
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = reply.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: activeId, content }),
      });
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Message;
      setMessages((prev) => [...prev, saved]);
      setReply("");
      loadThreads();
    } catch {
      // The thread reload below restores truth if the send failed.
      loadThread(activeId);
    } finally {
      setSending(false);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = threads.filter(
    (t) =>
      !q ||
      t.companyName.toLowerCase().includes(q) ||
      t.contactName.toLowerCase().includes(q)
  );
  const active = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="space-y-8">
      <PageHero
        title="Messages"
        description="Every client thread in one place."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
        {/* Thread list */}
        <section className="rounded-xl border border-border">
          <div className="border-b border-border p-3">
            <SearchPill
              value={query}
              onChange={setQuery}
              placeholder="Search clients…"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No clients match that search.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveId(t.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer",
                        activeId === t.id && "bg-accent/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">
                          {t.companyName}
                        </p>
                        {t.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-orange px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.lastMessage ?? "No messages yet"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Thread */}
        <section className="rounded-xl border border-border">
          {!active ? (
            <EmptyState
              icon={MessageSquare}
              title="Pick a client"
              description="Choose a thread on the left to read it and reply."
            />
          ) : (
            <div className="flex h-[60vh] flex-col">
              <div className="border-b border-border px-5 py-3">
                <p className="font-semibold">{active.companyName}</p>
                <p className="font-mono text-[11px] uppercase text-muted-foreground">
                  {active.contactName}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-muted-foreground">
                    Nothing here yet — send the first message.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "admin" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          m.role === "admin"
                            ? "bg-orange text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p
                          className={cn(
                            "mt-1 font-mono text-[10px]",
                            m.role === "admin"
                              ? "text-white/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {fmtWhen(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={send}
                className="flex items-center gap-3 border-t border-border p-4"
              >
                <Input
                  placeholder={`Reply to ${active.contactName}…`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <Button type="submit" disabled={sending || !reply.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
