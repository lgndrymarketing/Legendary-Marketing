import { currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
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

        <Card>
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
