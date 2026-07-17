import { NextResponse } from "next/server";
import { db } from "@/db";
import { adCampaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { canManageProjects } from "@/lib/permissions";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  platform: z.enum(["meta", "google", "tiktok", "other"]).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  // Money fields are integer cents
  monthlyBudget: z.number().int().min(0).nullable().optional(),
  totalSpend: z.number().int().min(0).optional(),
  leadsGenerated: z.number().int().min(0).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [campaign] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id));
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await verifyProjectAccess(campaign.projectId, user.id, user.role);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(adCampaigns)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(adCampaigns.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    if (!canManageProjects(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [campaign] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id));
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await verifyProjectAccess(campaign.projectId, user.id, user.role);

    await db.delete(adCampaigns).where(eq(adCampaigns.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
