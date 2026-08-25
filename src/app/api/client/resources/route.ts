import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientResourceKindEnum, clientResources } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";

/**
 * GET /api/client/resources?kind=guide|tutorial — the published guides or
 * tutorials for the portal. Signed-in clients only; drafts stay hidden.
 */
export async function GET(req: Request) {
  try {
    await getAuthenticatedUser();

    const kind = new URL(req.url).searchParams.get("kind");
    const valid = clientResourceKindEnum.enumValues.find((k) => k === kind);
    if (!valid) {
      return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: clientResources.id,
        title: clientResources.title,
        description: clientResources.description,
        body: clientResources.body,
        videoUrl: clientResources.videoUrl,
        duration: clientResources.duration,
        track: clientResources.track,
      })
      .from(clientResources)
      .where(
        and(
          eq(clientResources.kind, valid),
          eq(clientResources.published, true)
        )
      )
      .orderBy(asc(clientResources.order));

    return NextResponse.json({ resources: rows });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client resources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}
