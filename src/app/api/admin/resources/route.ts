import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientResourceKindEnum, clientResources } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Guides and Platform Tutorials, as the team manages them.
 * GET  — every resource, published or not, in display order.
 * POST — add one. Staff-accessible: this is content, not money.
 */

const createSchema = z.object({
  kind: z.enum(clientResourceKindEnum.enumValues),
  title: z.string().trim().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  body: z.string().max(50_000).nullable().optional(),
  videoUrl: z.string().max(1000).nullable().optional(),
  duration: z.string().max(20).nullable().optional(),
  track: z.string().max(100).nullable().optional(),
  order: z.number().int().min(0).max(999).optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireStaff();
    const rows = await db
      .select()
      .from(clientResources)
      .orderBy(asc(clientResources.kind), asc(clientResources.order));
    return NextResponse.json({ resources: rows });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Resources fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireStaff();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid resource", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const [created] = await db
      .insert(clientResources)
      .values(parsed.data)
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Resource create error:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
