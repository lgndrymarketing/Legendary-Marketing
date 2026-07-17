import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectComments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { isStaff } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    await verifyProjectAccess(projectId, user.id, user.role);

    const rows = await db
      .select({
        comment: projectComments,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorDbRole: users.role,
      })
      .from(projectComments)
      .leftJoin(users, eq(projectComments.userId, users.id))
      .where(eq(projectComments.projectId, projectId))
      .limit(200);

    const comments = rows.map((row) => {
      const fullName = [row.authorFirstName, row.authorLastName]
        .filter(Boolean)
        .join(" ");
      const authorName =
        fullName || row.authorEmail?.split("@")[0] || "User";
      const authorRole =
        row.authorDbRole && isStaff(row.authorDbRole) ? "admin" : "client";
      return { ...row.comment, authorName, authorRole };
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Comments error:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

const postCommentSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const body = await req.json();
    const parsed = postCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, content, parentId } = parsed.data;

    const project = await verifyProjectAccess(projectId, user.id, user.role);
    const rateLimit = checkRateLimit(user.id + ":comments", 20);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [comment] = await db
      .insert(projectComments)
      .values({
        projectId,
        userId: user.id,
        content,
        parentId: parentId || null,
      })
      .returning();

    // Notify the project's owner when someone else comments (best-effort,
    // outside the critical path — a failed notification never fails the post).
    if (project.userId !== user.id) {
      await createNotification({
        userId: project.userId,
        projectId,
        type: "comment_added",
        title: "New comment on your project",
        body: content.slice(0, 140),
        actionUrl: `/projects/${projectId}`,
      });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Comment error:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
