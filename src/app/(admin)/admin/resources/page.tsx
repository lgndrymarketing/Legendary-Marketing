"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHero, SegmentedTabs } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FocusBeam } from "@/components/ui/beam-focus";
import { rowCascade, rowItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BookOpen, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";

/**
 * Guides & Tutorials — the portal's Learn section, managed by the team.
 * Both were hardcoded arrays before, so publishing a video or fixing a typo
 * in a guide meant a code deploy.
 */

interface Resource {
  id: string;
  kind: "guide" | "tutorial";
  title: string;
  description: string | null;
  body: string | null;
  videoUrl: string | null;
  duration: string | null;
  track: string | null;
  order: number;
  published: boolean;
}

const TABS = ["Guides", "Tutorials"];
const KIND_BY_TAB: Record<string, Resource["kind"]> = {
  Guides: "guide",
  Tutorials: "tutorial",
};

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(TABS[0]);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/resources")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.resources)) setResources(data.resources);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const kind = KIND_BY_TAB[tab];
  const visible = resources.filter((r) => r.kind === kind);

  async function remove(r: Resource) {
    if (!window.confirm(`Delete "${r.title}"? Clients lose access to it.`))
      return;
    await fetch(`/api/admin/resources/${r.id}`, { method: "DELETE" });
    load();
  }

  async function togglePublished(r: Resource) {
    await fetch(`/api/admin/resources/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !r.published }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Guides & Tutorials"
        description="What clients read and watch in the Learn section of their portal."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add {kind === "guide" ? "Guide" : "Tutorial"}
          </Button>
        }
      />

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

      <section>
        {loading ? (
          <TableSkeleton rows={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`No ${kind === "guide" ? "guides" : "tutorials"} yet`}
            description={
              kind === "guide"
                ? "Add the onboarding and launch playbooks clients should read."
                : "Paste your Loom or YouTube links here and clients can watch them in the portal."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Title</th>
                  {kind === "tutorial" && (
                    <>
                      <th className="micro-label py-3 pr-4">Track</th>
                      <th className="micro-label py-3 pr-4">Video</th>
                    </>
                  )}
                  <th className="micro-label py-3 pr-4">Order</th>
                  <th className="micro-label py-3 pr-4">Visible</th>
                  <th className="micro-label py-3 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {visible.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={rowItem}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium">{r.title}</p>
                      {r.description && (
                        <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                    </td>
                    {kind === "tutorial" && (
                      <>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {r.track ?? "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {r.videoUrl ? (
                            <a
                              href={r.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-orange hover:underline"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">
                              No link
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {r.order}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => togglePublished(r)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors cursor-pointer",
                          r.published
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {r.published ? "Live" : "Hidden"}
                      </button>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditing(r)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        aria-label={`Edit ${r.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        aria-label={`Delete ${r.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>

      <ResourceModal
        open={creating || !!editing}
        kind={editing?.kind ?? kind}
        resource={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

/** Create or edit one guide or tutorial. */
function ResourceModal({
  open,
  kind,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: Resource["kind"];
  resource: Resource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    body: "",
    videoUrl: "",
    duration: "",
    track: "",
    order: "0",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the target changes, including create → edit.
  useEffect(() => {
    setForm({
      title: resource?.title ?? "",
      description: resource?.description ?? "",
      body: resource?.body ?? "",
      videoUrl: resource?.videoUrl ?? "",
      duration: resource?.duration ?? "",
      track: resource?.track ?? "",
      order: String(resource?.order ?? 0),
    });
    setError(null);
  }, [resource, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Give it a title.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      body: kind === "guide" ? form.body.trim() || null : null,
      videoUrl: kind === "tutorial" ? form.videoUrl.trim() || null : null,
      duration: kind === "tutorial" ? form.duration.trim() || null : null,
      track: kind === "tutorial" ? form.track.trim() || null : null,
      order: parseInt(form.order, 10) || 0,
    };
    try {
      const res = await fetch(
        resource ? `/api/admin/resources/${resource.id}` : "/api/admin/resources",
        {
          method: resource ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resource ? payload : { ...payload, kind }),
        }
      );
      if (!res.ok) throw new Error();
      onSaved();
    } catch {
      setError("Could not save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <FocusBeam className="relative w-full max-w-2xl">
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={submit}
              className="max-h-[85vh] w-full overflow-y-auto rounded-2xl border border-border/70 bg-background p-6 shadow-[0_1px_3px_rgba(15,16,16,0.06),0_24px_60px_-16px_rgba(15,16,16,0.3)] sm:p-8"
            >
              <div className="flex items-start justify-between pb-6">
                <h2 className="text-xl font-bold tracking-tight">
                  {resource ? "Edit" : "Add"}{" "}
                  {kind === "guide" ? "Guide" : "Tutorial"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Title
                  </span>
                  <Input
                    placeholder={
                      kind === "guide"
                        ? "e.g. Onboarding Guide"
                        : "e.g. How the CRM works"
                    }
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Description
                  </span>
                  <Input
                    placeholder="One line shown under the title"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                {kind === "guide" ? (
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold">
                      Body
                    </span>
                    <textarea
                      rows={14}
                      placeholder={
                        "Paste the guide here.\n\nLeave a blank line between sections. End a line with a colon to make it that section's heading:\nLike this paragraph, which sits under the heading above."
                      }
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-orange"
                      value={form.body}
                      onChange={(e) =>
                        setForm({ ...form, body: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="mb-1.5 block text-[13px] font-semibold">
                        Video Link
                      </span>
                      <Input
                        type="url"
                        placeholder="https://www.loom.com/share/…"
                        value={form.videoUrl}
                        onChange={(e) =>
                          setForm({ ...form, videoUrl: e.target.value })
                        }
                      />
                      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                        Without a link the card can&apos;t be opened — keep it
                        hidden until the video exists.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <span className="mb-1.5 block text-[13px] font-semibold">
                          Track
                        </span>
                        <Input
                          placeholder="e.g. LGNDRY Launchpad"
                          value={form.track}
                          onChange={(e) =>
                            setForm({ ...form, track: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <span className="mb-1.5 block text-[13px] font-semibold">
                          Duration
                        </span>
                        <Input
                          placeholder="e.g. 6:30"
                          value={form.duration}
                          onChange={(e) =>
                            setForm({ ...form, duration: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="sm:w-32">
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    Order
                  </span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.order}
                    onChange={(e) =>
                      setForm({ ...form, order: e.target.value })
                    }
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 border-t border-border pt-5">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="glow" disabled={saving}>
                    {saving ? "Saving…" : resource ? "Save Changes" : "Create"}
                  </Button>
                </div>
              </div>
            </motion.form>
          </FocusBeam>
        </div>
      )}
    </AnimatePresence>
  );
}
