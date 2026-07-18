import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectPhases, users, serviceTypeEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { projectPhaseNames } from "@/lib/services";
import { z } from "zod";

const createSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  serviceType: z.enum(serviceTypeEnum.enumValues),
});

/**
 * POST /api/admin/campaigns — manually create a campaign for a client
 * (admin-only). Mirrors what client onboarding creates: the project plus its
 * six standard phases.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid campaign", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { userId, name, serviceType } = parsed.data;

    const [client] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    if (!client || client.role !== "client") {
      return NextResponse.json(
        { error: "Pick a client portal account" },
        { status: 400 }
      );
    }

    const [project] = await db
      .insert(projects)
      .values({ userId, name, serviceType, status: "onboarding" })
      .returning();

    await db.insert(projectPhases).values(
      projectPhaseNames.map((phaseName, i) => ({
        projectId: project.id,
        name: phaseName,
        order: i,
        status: "pending" as const,
      }))
    );

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Admin campaign create error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
