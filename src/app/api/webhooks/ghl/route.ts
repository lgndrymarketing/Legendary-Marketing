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

    const rawBody = await req.text();

    // Two accepted auth forms:
    //  1. HMAC signature header (marketplace-app style webhooks)
    //  2. Shared secret in the x-webhook-secret header — GHL workflow
    //     "Custom Webhook" actions can't sign payloads, but they can attach
    //     custom headers. Set the header to the same value as
    //     GHL_WEBHOOK_SECRET when building the workflow.
    const signature = getSignatureHeader(req);
    const sharedSecret = req.headers.get("x-webhook-secret");

    const secretBuf = Buffer.from(secret);
    const sharedOk =
      sharedSecret !== null &&
      Buffer.byteLength(sharedSecret) === secretBuf.length &&
      timingSafeEqual(Buffer.from(sharedSecret), secretBuf);
    const signatureOk =
      signature !== null && verifySignature(rawBody, signature, secret);

    if (!sharedOk && !signatureOk) {
      console.error("GHL webhook auth failed (no valid signature or secret)");
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

    // Normalize/validate untrusted payload fields before they touch the DB.
    // Map GHL's free-form status onto our known set; anything unrecognized is
    // treated as "pending" rather than persisted verbatim. Clamp the amount to
    // a non-negative integer number of cents.
    const rawStatus = (status ?? "").toLowerCase();
    const paymentStatus =
      rawStatus === "won" || rawStatus === "completed" || rawStatus === "paid"
        ? "completed"
        : rawStatus === "lost" || rawStatus === "abandoned"
          ? "cancelled"
          : "pending";
    const safeAmount =
      typeof monetaryValue === "number" && Number.isFinite(monetaryValue)
        ? Math.max(0, Math.round(monetaryValue))
        : 0;

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
            ...(monetaryValue !== undefined ? { amount: safeAmount } : {}),
            updatedAt: new Date(),
          })
          .where(eq(payments.ghlPaymentId, opportunityId));
      } else {
        await db.insert(payments).values({
          projectId: project.id,
          userId: project.userId,
          amount: safeAmount,
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
