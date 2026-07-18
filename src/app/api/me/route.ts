import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";

/**
 * GET /api/me — the authenticated user's own profile.
 * PATCH /api/me — update the fields the portal owns (bio). Name and avatar
 * live in Clerk and sync back via the user.updated webhook.
 */

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      bio: user.bio,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Me GET error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

const patchSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const bio =
      parsed.data.bio === undefined
        ? undefined
        : parsed.data.bio?.trim() || null;

    const [updated] = await db
      .update(users)
      .set({ ...(bio !== undefined && { bio }), updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({ bio: users.bio });

    return NextResponse.json({ bio: updated.bio });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Me PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
