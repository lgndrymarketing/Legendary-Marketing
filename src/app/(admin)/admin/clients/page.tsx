import { redirect } from "next/navigation";
import { PageHero, BracketLabel } from "@/components/ui/firecrawl";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { db } from "@/db";
import { users, projects } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { canViewAllProjects } from "@/lib/permissions";

export default async function AdminClientsPage() {
  // This RSC reads all client PII directly — guard it here (the shared admin
  // layout only checks isStaff, which includes scoped VAs).
  const staff = await getAuthenticatedUser();
  if (!canViewAllProjects(staff.role)) {
    redirect("/admin/projects");
  }

  const clients = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      createdAt: users.createdAt,
      projectCount: count(projects.id),
    })
    .from(users)
    .leftJoin(projects, eq(projects.userId, users.id))
    .where(eq(users.role, "client"))
    .groupBy(users.id)
    .orderBy(users.createdAt);

  return (
    <div className="space-y-10">
      <PageHero title="Clients" description="Manage all registered clients." />

      <section>
        <BracketLabel n={clients.length} label="REGISTERED CLIENTS" className="pb-4" />
        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Clients who sign up will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="micro-label py-3 pr-4">Name</th>
                  <th className="micro-label py-3 pr-4">Email</th>
                  <th className="micro-label py-3 pr-4">Projects</th>
                  <th className="micro-label py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium transition-colors group-hover:text-orange">
                      {[client.firstName, client.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {client.email}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {client.projectCount}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
