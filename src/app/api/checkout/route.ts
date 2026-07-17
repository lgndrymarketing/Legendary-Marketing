import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPricing } from "@/lib/pricing";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { projectId }
 *
 * Prepares a Creem checkout for the given project:
 *   1. Authenticates and confirms the caller may access the project.
 *   2. Ensures a PENDING payment row exists for the project (so the webhook has
 *      a row to complete once payment lands).
 *   3. Returns the Creem-hosted checkout URL, or `{ configured: false }` when
 *      the checkout URL isn't set in the environment.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const rateLimit = checkRateLimit(`${user.id}:checkout`, 20);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId =
      body && typeof body === "object" && "projectId" in body
        ? (body as { projectId?: unknown }).projectId
        : undefined;

    if (typeof projectId !== "string" || !UUID_REGEX.test(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId is required" },
        { status: 400 }
      );
    }

    const project = await verifyProjectAccess(projectId, user.id, user.role);

    const pricing = getPricing(project.serviceType);
    if (!pricing) {
      return NextResponse.json(
        { error: "No pricing configured for this service" },
        { status: 400 }
      );
    }

    // Upsert a pending payment row for this project: reuse an existing one so we
    // don't spawn duplicate rows across repeated checkout attempts.
    const [existing] = await db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(eq(payments.projectId, projectId))
      .limit(1);

    if (!existing) {
      await db.insert(payments).values({
        projectId,
        userId: project.userId,
        amount: pricing.amountCents,
        currency: "usd",
        status: "pending",
        source: "creem",
      });
    } else if (existing.status !== "completed") {
      // Keep the amount in sync in case pricing changed since the row was made.
      await db
        .update(payments)
        .set({
          amount: pricing.amountCents,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existing.id));
    }

    // Build the Creem-hosted checkout redirect. If it isn't configured, tell the
    // UI so it can show a clear "not configured" message.
    const baseUrl = process.env.NEXT_PUBLIC_CREEM_CHECKOUT_URL;
    if (!baseUrl) {
      return NextResponse.json({ configured: false });
    }

    const url = new URL(baseUrl);
    url.searchParams.set("metadata[projectId]", projectId);
    url.searchParams.set("metadata[amount]", String(pricing.amountCents));

    return NextResponse.json({ configured: true, checkoutUrl: url.toString() });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Response) return error;
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
