"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { PageHero } from "@/components/ui/firecrawl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";
import { Camera, ShieldCheck, Check } from "lucide-react";

interface Profile {
  bio: string | null;
  role: UserRole;
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setProfile({ bio: data.bio, role: data.role });
          setBio(data.bio ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Could not save your profile — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setError(null);
    setUploading(true);
    try {
      await user.setProfileImage({ file });
    } catch {
      setError("Could not update your photo — try a smaller image.");
    } finally {
      setUploading(false);
    }
  }

  const loading = !isLoaded;

  return (
    <div className="space-y-10">
      <PageHero
        title="Settings"
        description="Your profile, photo, and account security."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUserProfile()}
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Manage Account
          </Button>
        }
      />

      <div className="animate-fade-up grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {/* Profile */}
        <section className="pb-8 lg:pb-10 lg:pr-10">
          <h2 className="text-[15px] font-semibold">Profile</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            How you appear across the portal.
          </p>

          {loading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={save} className="mt-6 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {user?.imageUrl && (
                    <Image
                      src={user.imageUrl}
                      alt="Profile photo"
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="mr-1.5 h-4 w-4" />
                    {uploading ? "Uploading…" : "Change Photo"}
                  </Button>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    JPG or PNG, up to 10MB
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAvatar(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    First Name
                  </span>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Last Name
                  </span>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <span className="mb-1.5 block text-[13px] font-medium">
                  Bio
                </span>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A sentence or two about you or your business…"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-success">
                    <Check className="h-3.5 w-3.5" />
                    Saved
                  </span>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Account */}
        <section className="py-8 lg:py-0 lg:pb-10 lg:pl-10">
          <h2 className="text-[15px] font-semibold">Account</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Sign-in details, managed securely by Clerk.
          </p>
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs">
                {user?.emailAddresses[0]?.emailAddress ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">
                {ROLE_LABELS[profile?.role ?? "client"]}
              </Badge>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Change your email, password, or connected accounts — plus
            two-factor authentication — from{" "}
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="font-medium text-orange underline-offset-2 hover:underline cursor-pointer"
            >
              Manage Account
            </button>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
