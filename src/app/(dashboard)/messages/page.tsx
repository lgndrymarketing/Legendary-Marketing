"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/ui/firecrawl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePolling } from "@/hooks/use-polling";

/**
 * Messages — one thread between the client and the LGNDRY team, scoped to
 * their client record. Not project-scoped: a retainer client has no project,
 * and the old thread was unreachable for them.
 */

interface Message {
  id: string;
  content: string;
  role: "client" | "admin";
  senderId: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const apply = useCallback(
    (data: { messages?: Message[]; ready?: boolean } | null) => {
      if (!data) return;
      if (Array.isArray(data.messages)) setMessages(data.messages);
      if (typeof data.ready === "boolean") setReady(data.ready);
    },
    []
  );

  useEffect(() => {
    fetch("/api/client/messages")
      .then((res) => (res.ok ? res.json() : null))
      .then(apply)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apply]);

  // No Ably here: its token endpoint is scoped to project access, and this
  // thread has no project. Polling keeps it live without that dependency.
  usePolling<{ messages?: Message[]; ready?: boolean }>({
    url: "/api/client/messages",
    interval: 10000,
    onUpdate: apply,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/client/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Message;
      setMessages((prev) => [...prev, saved]);
      setNewMessage("");
    } catch {
      setError("Could not send that — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Messages"
        description="Talk directly with your LGNDRY team."
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-2/3" />
          ))}
        </div>
      ) : !ready ? (
        <div className="rounded-xl border border-border">
          <EmptyState
            icon={MessageSquare}
            title="Your account is being set up"
            description="Once the LGNDRY team links your account you can message them here."
          />
        </div>
      ) : (
        <div className="flex h-[60vh] flex-col rounded-xl border border-border">
          {/* Thread */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                No messages yet — say hello and your team will reply here.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "client" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "client"
                        ? "bg-orange text-white"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p
                      className={cn(
                        "mt-1 font-mono text-[10px]",
                        m.role === "client"
                          ? "text-white/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {new Date(m.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={send}
            className="flex items-center gap-3 border-t border-border p-4"
          >
            <Input
              placeholder="Write a message…"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          {error && (
            <p className="px-4 pb-3 text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
