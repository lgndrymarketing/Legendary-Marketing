import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createTokenRequest, isAblyConfigured } from "@/lib/ably";
import { isStaff } from "@/lib/permissions";

/**
 * POST /api/ably/crm-token — a subscribe-only token for the shared CRM channel
 * (`admin:crm`), so team members see pipeline/task changes live. Staff-only.
 */
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!isStaff(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isAblyConfigured()) {
      return NextResponse.json(
        { error: "Real-time is not configured" },
        { status: 503 }
      );
    }
    const tokenRequest = await createTokenRequest(user.id, "admin:crm");
    return NextResponse.json(tokenRequest);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("CRM Ably token error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
