import { NextResponse } from "next/server";
import { db } from "@/db";
import { mcpKeys, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { generateMcpKey } from "@/lib/mcp-server";
import { z } from "zod";

/**
 * MCP access keys — admin-only management surface.
 * GET  — every key (active and revoked) with usage.
 * POST — mint a key. The plaintext appears in this response ONCE; only its
 *        hash is stored, so it cannot be shown again.
 */

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: mcpKeys.id,
        name: mcpKeys.name,
        keyPrefix: mcpKeys.keyPrefix,
        createdByName: users.firstName,
        createdByEmail: users.email,
        lastUsedAt: mcpKeys.lastUsedAt,
        requestCount: mcpKeys.requestCount,
        revokedAt: mcpKeys.revokedAt,
        createdAt: mcpKeys.createdAt,
      })
      .from(mcpKeys)
      .innerJoin(users, eq(mcpKeys.createdBy, users.id))
      .orderBy(desc(mcpKeys.createdAt));
    return NextResponse.json({ keys: rows });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("MCP keys fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Name the key" }, { status: 400 });
    }
    const { plaintext, hash, prefix } = generateMcpKey();
    const [created] = await db
      .insert(mcpKeys)
      .values({
        name: parsed.data.name,
        keyHash: hash,
        keyPrefix: prefix,
        createdBy: admin.id,
      })
      .returning({ id: mcpKeys.id });
    return NextResponse.json({ id: created.id, key: plaintext }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("MCP key create error:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
