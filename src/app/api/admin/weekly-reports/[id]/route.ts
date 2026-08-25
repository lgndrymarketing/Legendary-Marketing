import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-utils";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";

/**
 * DELETE /api/admin/weekly-reports/[id] — remove a weekly data entry.
 *
 * Staff-accessible, matching who can create one: data entry is an operations
 * job and a typo needs to be removable by the person who made it. Deleting a
 * completed report also discards the closes/revenue the client filled in, so
 * the UI confirms that explicitly before calling this.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(weeklyReports)
      .where(eq(weeklyReports.id, id))
      .returning({ id: weeklyReports.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await publishToChannel("admin:crm", "update", { type: "report_deleted" });
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Weekly report delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
