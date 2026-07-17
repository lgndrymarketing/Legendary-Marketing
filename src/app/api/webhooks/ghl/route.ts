import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { payments, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

// GHL's exact webhook signature header can vary by webhook/workflow type —
// check the common candidates rather than hard-coding one.
function getSignatureHeader(req: Request): string | null {
  return (
    req.headers.get("x-wh-signature") ??
    req.headers.get("x-ghl-signature") ??
    req.headers.get("x-gohighlevel-signature") ??
    req.headers.get("webhook-signature") ??
    null
  );
}

function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateLimit = checkRateLimit(`ghl-webhook:${ip}`, 100, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Verify webhook signature
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (!secret) {
      console.error("GHL_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const signature = getSignatureHeader(req);
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    const rawBody = await req.text();

    if (!verifySignature(rawBody, signature, secret)) {
      console.error("GHL webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    // GHL webhook payload shapes vary by event/workflow type — this
    // scaffold reads the fields most commonly present for
    // opportunity/invoice status change events. Adjust once real payloads
    // are available.
    const eventType: string | undefined = body.type ?? body.event;
    const opportunityId: string | undefined =
      body.opportunity?.id ?? body.opportunityId ?? body.id;
    const status: string | undefined =
      body.opportunity?.status ?? body.status;
    const monetaryValue: number | undefined =
      body.opportunity?.monetaryValue ?? body.monetaryValue;

    if (!opportunityId) {
      return NextResponse.json({ received: true, skipped: "no opportunityId" });
    }

    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.ghlOpportunityId, opportunityId));

    if (!project) {
      return NextResponse.json({
        received: true,
        skipped: "no matching project for opportunity",
      });
    }

    const paymentStatus = status === "won" ? "completed" : status ?? "pending";

    // Idempotency check: skip if this payment is already recorded with the
    // same status.
    const existing = await db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(
        and(
          eq(payments.ghlPaymentId, opportunityId),
          eq(payments.status, paymentStatus)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ received: true, skipped: "already processed" });
    }

    try {
      const [existingPayment] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.ghlPaymentId, opportunityId))
        .limit(1);

      if (existingPayment) {
        await db
          .update(payments)
          .set({
            status: paymentStatus,
            ...(monetaryValue !== undefined ? { amount: Math.round(monetaryValue) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(payments.ghlPaymentId, opportunityId));
      } else {
        await db.insert(payments).values({
          projectId: project.id,
          userId: project.userId,
          amount: Math.round(monetaryValue ?? 0),
          status: paymentStatus,
          source: "ghl",
          ghlPaymentId: opportunityId,
        });
      }

      if (paymentStatus === "completed") {
        await db
          .update(projects)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(projects.id, project.id));
      }
    } catch (dbError) {
      console.error("GHL webhook: failed to update payment/project", {
        projectId: project.id,
        opportunityId,
        eventType,
        error: dbError instanceof Error ? dbError.message : dbError,
      });
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("GHL webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
