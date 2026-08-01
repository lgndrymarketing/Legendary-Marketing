import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * POST /api/device-tokens — register this device for push.
 *
 * Called by the native shell on every launch. The token is the natural key:
 * re-registering the same device refreshes `lastSeenAt` and re-points the
 * row at whoever is signed in now (phones get handed over, and a stale
 * mapping would send one person's notifications to another).
 *
 * DELETE removes the token — used on sign-out.
 */

const tokenSchema = z.object({
  token: z.string().min(16).max(512),
  platform: z.enum(["ios", "android"]),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    const parsed = tokenSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const { token, platform } = parsed.data;

    const [existing] = await db
      .select({ id: deviceTokens.id, userId: deviceTokens.userId })
      .from(deviceTokens)
      .where(eq(deviceTokens.token, token));

    if (existing) {
      await db
        .update(deviceTokens)
        .set({ userId: user.id, platform, lastSeenAt: new Date() })
        .where(eq(deviceTokens.id, existing.id));
    } else {
      await db
        .insert(deviceTokens)
        .values({ userId: user.id, token, platform });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Device token register error:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const parsed = z
      .object({ token: z.string().min(16).max(512) })
      .safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    await db
      .delete(deviceTokens)
      .where(
        and(
          eq(deviceTokens.token, parsed.data.token),
          eq(deviceTokens.userId, user.id)
        )
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Device token delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove device" },
      { status: 500 }
    );
  }
}
