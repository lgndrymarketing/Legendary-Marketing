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

export default function MessagesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch projects
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0) setSelectedProjectId(data[0].id);
        }
      })
      .catch(() => {
        setError("Failed to load projects. Please try again.");
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch messages when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setMessages([]);
    fetch(`/api/messages?projectId=${selectedProjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {
        setMessages([]);
      });
  }, [selectedProjectId]);

  // Real-time updates layered on top of the REST API above — the DB stays
  // the source of truth, this just pushes new messages in as they arrive.
  const { messages: realtimeMessages, connectionState } = useAblyChannel<Message>(
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

  // Polling fallback — when Ably isn't connected (not configured, or the
  // connection failed), refresh from the REST API so replies still arrive
  // without a reload. Same merge-by-id dedup as the realtime path above.
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

  // Auto-scroll to bottom
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
          description="Chat with the Legendary Marketing team about your project."
        />
        <div
          className="flex flex-col rounded-xl border border-border"
          style={{ height: "calc(100vh - 300px)" }}
        >
          <div className="border-b border-border px-4 py-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex-1 space-y-4 p-4">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-16 w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Messages"
        description="Chat with the Legendary Marketing team about your project."
        action={
          connectionState === "connected" ? (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-orange">
              [ Live ]
            </span>
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-border">
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Once you have an active project, you can chat directly with the Legendary Marketing team here."
          />
        </div>
      ) : (
        <>
          {/* Project selector */}
          {projects.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant={selectedProjectId === project.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          )}

          <div
            className="flex flex-col overflow-hidden rounded-xl border border-border"
            style={{ height: "calc(100vh - 300px)" }}
          >
            <div className="border-b border-border px-4 py-3.5">
              <h2 className="text-[15px] font-semibold">
                {selectedProject?.name || "Select a project"}
              </h2>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 text-orange/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Send one below to get started.</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      message.role === "client" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm",
                        message.role === "client"
                          ? "bg-orange text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {message.role === "admin" ? "Legendary Marketing Team" : "You"} &middot;{" "}
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t border-border p-4">
              <form className="flex gap-2" onSubmit={handleSend}>
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
