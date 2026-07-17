import { NextResponse } from "next/server";
import { db } from "@/db";
import { satisfactionSurveys } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";

const createSurveySchema = z.object({
  projectId: z.string().uuid(),
  score: z.number().int().min(1).max(10),
  feedback: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const body = await req.json();
    const parsed = createSurveySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, score, feedback } = parsed.data;

    await verifyProjectAccess(projectId, user.id, user.role);

    const rateLimit = checkRateLimit(user.id + ":surveys", 5);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // One survey per user per project — repeat submissions update the
    // original instead of stacking duplicate scores.
    const [existing] = await db
      .select({ id: satisfactionSurveys.id })
      .from(satisfactionSurveys)
      .where(
        and(
          eq(satisfactionSurveys.projectId, projectId),
          eq(satisfactionSurveys.userId, user.id)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(satisfactionSurveys)
        .set({ score, feedback })
        .where(eq(satisfactionSurveys.id, existing.id))
        .returning();
      return NextResponse.json(updated);
    }

    const [survey] = await db
      .insert(satisfactionSurveys)
      .values({
        projectId,
        userId: user.id,
        score,
        feedback,
      })
      .returning();

    return NextResponse.json(survey);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Survey error:", error);
    return NextResponse.json(
      { error: "Failed to submit survey" },
      { status: 500 }
    );
  }
}
