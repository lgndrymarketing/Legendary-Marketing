import { currentUser } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/ui/firecrawl";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";

export default async function SettingsPage() {
  const user = await currentUser();

  const [dbUser] = user
    ? await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.clerkId, user.id))
    : [];
  const role = (dbUser?.role ?? "client") as UserRole;

  return (
    <div className="space-y-10">
      <PageHero
        title="Settings"
        description="Manage your account and preferences."
      />

      {/* Hairline-divided sections, no card shadows */}
      <div className="animate-fade-up grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <section className="pb-8 lg:pb-10 lg:pr-10">
          <h2 className="text-[15px] font-semibold">Account</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Your profile information from Clerk.
          </p>
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs">
                {user?.emailAddresses[0]?.emailAddress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            </div>
          </div>
        </section>

        <section className="py-8 lg:py-0 lg:pb-10 lg:pl-10">
          <h2 className="text-[15px] font-semibold">Billing</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Payment history and invoices.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Payments are processed securely through Creem.io. Contact us for billing inquiries.
          </div>
        </section>
      </div>
    </div>
  );
}
