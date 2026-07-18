import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, messages, files } from "@/db/schema";
import { ilike, and, inArray } from "drizzle-orm";
import { getAuthenticatedUser, getAccessibleProjectIds } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const rateLimit = checkRateLimit(user.id + ":search", 30);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.trim().length < 2 || q.length > 100) {
      return NextResponse.json([]);
    }

    const pattern = `%${q}%`;

    // Resolve the projects this user may search within, by role.
    const accessible = await getAccessibleProjectIds(user.id, user.role);
    const seesAll = accessible === "all";
    const accessibleProjectIds = seesAll ? [] : accessible;

    if (!seesAll && accessibleProjectIds.length === 0) {
      return NextResponse.json([]);
    }

    // Search projects
    const projectResults = await db
      .select()
      .from(projects)
      .where(
        seesAll
          ? ilike(projects.name, pattern)
          : and(
              inArray(projects.id, accessibleProjectIds),
              ilike(projects.name, pattern)
            )
      )
      .limit(5);

    // Search messages - filtered by accessible projects
    const messageResults = await db
      .select()
      .from(messages)
      .where(
        seesAll
          ? ilike(messages.content, pattern)
          : and(
              ilike(messages.content, pattern),
              inArray(messages.projectId, accessibleProjectIds)
            )
      )
      .limit(5);

    // Search files - filtered by accessible projects
    const fileResults = await db
      .select()
      .from(files)
      .where(
        seesAll
          ? ilike(files.name, pattern)
          : and(
              ilike(files.name, pattern),
              inArray(files.projectId, accessibleProjectIds)
            )
      )
      .limit(5);

    const results = [
      ...projectResults.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.name,
        subtitle: `${p.serviceType} · ${p.status}`,
        href: `/campaigns/${p.id}`,
      })),
      ...messageResults.map((m) => ({
        id: m.id,
        type: "message" as const,
        title: m.content.substring(0, 80),
        subtitle: `Message · ${m.role}`,
        href: "/messages",
      })),
      ...fileResults.map((f) => ({
        id: f.id,
        type: "file" as const,
        title: f.name,
        subtitle: `File · ${f.type || "unknown"}`,
        href: `/campaigns/${f.projectId}`,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
