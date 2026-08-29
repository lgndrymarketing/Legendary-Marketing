import { NextResponse } from "next/server";
import { db } from "@/db";
import { mcpKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

/** DELETE /api/admin/mcp-keys/[id] — revoke. Soft: the row survives as an
 * audit trail of the key having existed, but auth fails from now on. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const [revoked] = await db
      .update(mcpKeys)
      .set({ revokedAt: new Date() })
      .where(eq(mcpKeys.id, id))
      .returning({ id: mcpKeys.id });
    if (!revoked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("MCP key revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
