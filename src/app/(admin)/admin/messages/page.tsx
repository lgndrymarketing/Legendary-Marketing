"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/ui/firecrawl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAblyChannel } from "@/hooks/use-ably-channel";
import { usePolling } from "@/hooks/use-polling";

interface Message {
  id: string;
  content: string;
  role: "client" | "admin";
  senderId: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  serviceType: string;
}

/**
 * Admin message center — staff side of client <> agency messaging. Lives in
 * the admin shell (the old route redirected staff into the client dashboard,
 * which is scoped to campaigns the viewer OWNS — admins own none, so it
 * broke). Staff see every campaign here via the staff-scoped projects API.
 */
export default function AdminMessagesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0) setSelectedProjectId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setMessages([]);
    fetch(`/api/messages?projectId=${selectedProjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => setMessages([]));
  }, [selectedProjectId]);

  const { messages: realtimeMessages, connectionState } =
    useAblyChannel<Message>(
      selectedProjectId ? `project:${selectedProjectId}:messages` : null
    );

  useEffect(() => {
    if (realtimeMessages.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const incoming = realtimeMessages.filter((m) => !existingIds.has(m.id));
      if (incoming.length === 0) return prev;
      return [...prev, ...incoming];
    });
  }, [realtimeMessages]);

  usePolling<Message[]>({
    url: `/api/messages?projectId=${selectedProjectId}`,
    interval: 15000,
    enabled: !!selectedProjectId && connectionState !== "connected",
    onUpdate: (data) => {
      if (!Array.isArray(data)) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const incoming = data.filter((m) => !existingIds.has(m.id));
        if (incoming.length === 0) return prev;
        return [...prev, ...incoming];
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProjectId) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          content: newMessage,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      }
    } catch {
      window.alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHero
          title="Messages"
          description="Chat with clients across every campaign."
        />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Messages"
        description="Chat with clients across every campaign."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No campaigns yet"
          description="Once campaigns exist, their message threads appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
          {/* Campaign list */}
          <aside className="lg:border-r lg:border-border lg:pr-6">
            <p className="micro-label border-b border-border pb-3">
              Campaigns
            </p>
            <div className="mt-3 space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors cursor-pointer",
                    project.id === selectedProjectId
                      ? "bg-orange/[0.08] font-medium text-orange"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <span className="block truncate">{project.name}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Thread */}
          <section className="flex min-h-[28rem] flex-col">
            <div className="border-b border-border pb-3">
              <h2 className="text-[15px] font-semibold">
                {selectedProject?.name ?? "Select a campaign"}
              </h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto py-5">
              {messages.length === 0 ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  No messages yet — start the conversation.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "admin" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                        message.role === "admin"
                          ? "bg-orange text-white"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p
                        className={cn(
                          "mt-1 font-mono text-[10px]",
                          message.role === "admin"
                            ? "text-white/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {message.role === "admin" ? "LGNDRY Team" : "Client"} ·{" "}
                        {new Date(message.createdAt).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" }
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-border pt-4"
            >
              <Input
                placeholder="Reply to the client…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!selectedProjectId || sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sending}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
