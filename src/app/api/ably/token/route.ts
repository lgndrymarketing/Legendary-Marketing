import { NextResponse } from "next/server";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { createTokenRequest, isAblyConfigured } from "@/lib/ably";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!isAblyConfigured()) {
      return NextResponse.json(
        { error: "Real-time messaging is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId;
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Only users with access to this project may get a token scoped to its
    // messages channel.
    await verifyProjectAccess(projectId, user.id, user.role);

    const tokenRequest = await createTokenRequest(
      user.id,
      `project:${projectId}:messages`
    );

    return NextResponse.json(tokenRequest);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Ably token error:", error);
    return NextResponse.json(
      { error: "Failed to create token request" },
      { status: 500 }
    );
  }
}
