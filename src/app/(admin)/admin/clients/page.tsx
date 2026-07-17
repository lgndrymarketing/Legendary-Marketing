import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { db } from "@/db";
import { users, projects } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export default async function AdminClientsPage() {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Clients</h1>
        <p className="text-muted-foreground mt-1">Manage all registered clients.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange" />
            All Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Projects</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium">
                        {[client.firstName, client.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">{client.email}</td>
                      <td className="py-3">
                        <Badge variant="secondary">{client.projectCount}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
