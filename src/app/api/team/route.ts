import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-utils";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const includeClients = searchParams.get("includeClients") === "true";

    const results = includeClients
      ? await db.select().from(users).limit(200)
      : await db.select().from(users).where(ne(users.role, "client"));

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(userRoles),
});

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, role } = parsed.data;

    if (userId === admin.id && role !== "admin") {
      return NextResponse.json(
        { error: "You can't demote yourself" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Team update error:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
