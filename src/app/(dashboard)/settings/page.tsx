import { currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your profile information from Clerk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.emailAddresses[0]?.emailAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Payment history and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Payments are processed securely through Creem.io. Contact us for billing inquiries.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
