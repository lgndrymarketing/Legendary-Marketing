import { notFound } from "next/navigation";
import { db } from "@/db";
import { projectPhases, onboardingSubmissions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { serviceLabels } from "@/lib/services";
import { ManageClient } from "./manage-client";

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  revision: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  // verifyProjectAccess returns the project or throws a NextResponse on
  // missing / forbidden — in a page we treat any of those as not-found.
  const project = await verifyProjectAccess(id, user.id, user.role).catch(
    () => null
  );
  if (!project) notFound();

  const [clientUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, project.userId));

  const [phases, onboardingRows] = await Promise.all([
    db.select().from(projectPhases).where(eq(projectPhases.projectId, id)),
    db
      .select()
      .from(onboardingSubmissions)
      .where(eq(onboardingSubmissions.projectId, id)),
  ]);

  const sortedPhases = phases
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      status: p.status,
      order: p.order,
    }));

  const clientName =
    [clientUser?.firstName, clientUser?.lastName].filter(Boolean).join(" ") ||
    clientUser?.email ||
    "Unknown client";

  const onboarding = onboardingRows[0];

  return (
    <ManageClient
      projectId={project.id}
      projectName={project.name}
      status={project.status}
      statusLabel={statusLabels[project.status] || project.status}
      serviceLabel={serviceLabels[project.serviceType] || project.serviceType}
      clientName={clientName}
      clientEmail={clientUser?.email ?? "—"}
      phases={sortedPhases}
      onboarding={
        onboarding
          ? {
              businessName: onboarding.businessName,
              industry: onboarding.industry,
              description: onboarding.description,
              budget: onboarding.budget,
              timeline: onboarding.timeline,
            }
          : null
      }
    />
  );
}
