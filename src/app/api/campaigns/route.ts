import { NextResponse } from "next/server";
import { db } from "@/db";
import { adCampaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { canManageProjects } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Clients can view campaigns on their own projects; staff can view all.
    await verifyProjectAccess(projectId, user.id, user.role);

    const campaigns = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.projectId, projectId))
      .orderBy(desc(adCampaigns.createdAt));

    return NextResponse.json(campaigns);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

const createCampaignSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  platform: z.enum(["meta", "google", "tiktok", "other"]),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  // Money fields are integer cents
  monthlyBudget: z.number().int().min(0).optional(),
  totalSpend: z.number().int().min(0).optional(),
  leadsGenerated: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, name, platform, status, monthlyBudget, totalSpend, leadsGenerated, notes } =
      parsed.data;

    await verifyProjectAccess(projectId, user.id, user.role);
    const rateLimit = checkRateLimit(user.id + ":campaigns", 60);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [campaign] = await db
      .insert(adCampaigns)
      .values({
        projectId,
        name,
        platform,
        status: status ?? "draft",
        monthlyBudget,
        totalSpend: totalSpend ?? 0,
        leadsGenerated: leadsGenerated ?? 0,
        notes,
      })
      .returning();

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
