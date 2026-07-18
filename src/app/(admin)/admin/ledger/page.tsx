"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rowCascade, rowItem, cascade, cascadeItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { HandCoins, Plus } from "lucide-react";

interface LedgerEntry {
  id: string;
  partnerId: string;
  entryType: "credit" | "payout";
  amount: number;
  description: string | null;
  createdAt: string;
  partnerFirstName: string | null;
  partnerLastName: string | null;
  partnerEmail: string | null;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  credited: number;
  paidOut: number;
  balance: number;
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange";

export default function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    partnerId: "",
    entryType: "credit",
    amount: "",
    description: "",
  });

  const load = useCallback(() => {
    fetch("/api/admin/ledger")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setPartners(data.partners ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (!form.partnerId || !Number.isFinite(cents) || cents <= 0) {
      setError("Pick a partner and enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: form.partnerId,
          entryType: form.entryType,
          amount: cents,
          description: form.description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ ...form, amount: "", description: "" });
      setFormOpen(false);
      load();
    } catch {
      setError("Could not save the entry — try again.");
    } finally {
      setSaving(false);
    }
  }

  const partnerName = (e: LedgerEntry) =>
    [e.partnerFirstName, e.partnerLastName].filter(Boolean).join(" ") ||
    e.partnerEmail ||
    "—";

  return (
    <div className="space-y-10">
      <PageHero
        title="Partner Ledger"
        description="Profit splits between partners — credits allocate a share, payouts record money sent."
        action={
          <Button size="sm" onClick={() => setFormOpen((o) => !o)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Entry
          </Button>
        }
      />

      {/* Partner balances */}
      <motion.section variants={cascade} initial="hidden" animate="visible">
        <BracketLabel
          n={partners.length}
          label="PARTNERS"
          className="pb-4"
        />
        {loading ? (
          <TableSkeleton rows={2} />
        ) : partners.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="No partners found"
            description="Admins and project managers appear here once they exist on the team."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <motion.div
                key={partner.id}
                variants={cascadeItem}
                className="rounded-xl border border-border p-5"
              >
                <p className="truncate font-medium">{partner.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {partner.email}
                </p>
                <p
                  className={cn(
                    "mt-4 text-3xl font-bold tracking-tight",
                    partner.balance > 0 ? "text-orange" : "text-foreground"
                  )}
                >
                  {usd(partner.balance)}
                </p>
                <p className="micro-label mt-1">Owed balance</p>
                <div className="mt-4 flex justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
                  <span>Credited {usd(partner.credited)}</span>
                  <span>Paid out {usd(partner.paidOut)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Inline entry form */}
      {formOpen && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="rounded-xl border border-border p-5"
        >
          <p className="micro-label pb-4">New ledger entry</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_auto_1fr_auto]">
            <select
              className={selectClass}
              value={form.partnerId}
              onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
            >
              <option value="">Select partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={form.entryType}
              onChange={(e) => setForm({ ...form, entryType: e.target.value })}
            >
              <option value="credit">Credit (allocate share)</option>
              <option value="payout">Payout (money sent)</option>
            </select>
            <Input
              className="sm:w-32"
              placeholder="Amount ($)"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              placeholder="Description (e.g. 50% split — Acme setup fee)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </motion.form>
      )}

      {/* Entry history */}
      <section>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <HandCoins className="h-4 w-4 text-orange" />
          <h2 className="text-[15px] font-semibold">Ledger History</h2>
        </div>
        {loading ? (
          <div className="pt-4">
            <TableSkeleton rows={5} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="No entries yet"
            description="Record a credit when profit is split, and a payout when money is actually transferred."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Partner</th>
                  <th className="micro-label py-3 pr-4">Type</th>
                  <th className="micro-label py-3 pr-4">Amount</th>
                  <th className="micro-label py-3 pr-4">Description</th>
                  <th className="micro-label py-3">Date</th>
                </tr>
              </thead>
              <motion.tbody
                variants={rowCascade}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {entries.map((entry) => (
                  <motion.tr
                    key={entry.id}
                    variants={rowItem}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {partnerName(entry)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold uppercase tracking-wide",
                          entry.entryType === "credit"
                            ? "text-success"
                            : "text-orange"
                        )}
                      >
                        {entry.entryType}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-4 font-mono font-semibold",
                        entry.entryType === "payout" && "text-muted-foreground"
                      )}
                    >
                      {entry.entryType === "payout" ? "−" : "+"}
                      {usd(entry.amount)}
                    </td>
                    <td className="max-w-72 truncate py-3 pr-4 text-muted-foreground">
                      {entry.description ?? "—"}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
