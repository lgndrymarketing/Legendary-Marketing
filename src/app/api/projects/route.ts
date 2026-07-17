import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getAuthenticatedUser, getAccessibleProjectIds } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const accessible = await getAccessibleProjectIds(user.id, user.role);

    if (accessible === "all") {
      const userProjects = await db.select().from(projects).limit(100);
      return NextResponse.json(userProjects);
    }

    if (accessible.length === 0) {
      return NextResponse.json([]);
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.id, accessible));

    return NextResponse.json(userProjects);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
