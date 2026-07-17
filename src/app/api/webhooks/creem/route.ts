import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { db } from "@/db";
import { payments, projects, invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPricing, formatUsd } from "@/lib/pricing";
import { createNotification } from "@/lib/notifications";

function getSignatureHeader(req: Request): string | null {
  return (
    req.headers.get("x-creem-signature") ??
    req.headers.get("x-signature") ??
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
    const rateLimit = checkRateLimit(`creem-webhook:${ip}`, 100, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Verify webhook signature
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error("CREEM_WEBHOOK_SECRET is not set");
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
      console.error("Creem webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const { event, data } = body;

    if (event === "payment.completed" || event === "checkout.completed") {
      const projectId = data.metadata?.projectId;
      const creemPaymentId = data.id;

      if (!projectId) {
        return NextResponse.json({ received: true, skipped: "no projectId" });
      }

      // Idempotency check: skip if this payment is already completed
      if (creemPaymentId) {
        const existing = await db
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.creemPaymentId, creemPaymentId),
              eq(payments.status, "completed")
            )
          )
          .limit(1);

        if (existing.length > 0) {
          return NextResponse.json({
            received: true,
            skipped: "already processed",
          });
        }
      }

      try {
        // We need the project both to flip its status and, defensively, to
        // recover the userId + service if no pending payment row exists.
        const [project] = await db
          .select({
            id: projects.id,
            userId: projects.userId,
            serviceType: projects.serviceType,
          })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          return NextResponse.json({
            received: true,
            skipped: "unknown project",
          });
        }

        const pricing = getPricing(project.serviceType);

        // Find the pending payment row created at checkout time.
        const [pending] = await db
          .select({ id: payments.id, amount: payments.amount })
          .from(payments)
          .where(eq(payments.projectId, projectId))
          .limit(1);

        let paymentId: string;
        let paymentAmount: number;

        if (pending) {
          // Complete the row the checkout flow created.
          await db
            .update(payments)
            .set({
              status: "completed",
              creemPaymentId: creemPaymentId,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, pending.id));
          paymentId = pending.id;
          paymentAmount = pending.amount;
        } else {
          // Defensive: no checkout row exists (e.g. payment created out-of-band).
          // Insert a completed payment so revenue isn't lost.
          paymentAmount = pricing?.amountCents ?? 0;
          const [inserted] = await db
            .insert(payments)
            .values({
              projectId,
              userId: project.userId,
              creemPaymentId: creemPaymentId,
              amount: paymentAmount,
              currency: "usd",
              status: "completed",
              source: "creem",
            })
            .returning({ id: payments.id });
          paymentId = inserted.id;
        }

        // Advance the project now that it's paid.
        await db
          .update(projects)
          .set({
            status: "in_progress",
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));

        // Generate an invoice — idempotently (one per payment).
        const [existingInvoice] = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.paymentId, paymentId))
          .limit(1);

        if (!existingInvoice) {
          const items = (pricing?.lineItems ?? [
            { name: "Project services", amountCents: paymentAmount },
          ]).map((li) => ({
            description: li.name,
            amount: formatUsd(li.amountCents),
          }));

          const invoiceNumber = `LM-${new Date().getFullYear()}-${randomBytes(3)
            .toString("hex")
            .toUpperCase()}`;

          await db.insert(invoices).values({
            paymentId,
            projectId,
            userId: project.userId,
            invoiceNumber,
            items,
            subtotal: paymentAmount,
            tax: 0,
            total: paymentAmount,
            status: "paid",
          });
        }

        // Tell the client their payment landed and work is starting.
        await createNotification({
          userId: project.userId,
          projectId,
          type: "payment_confirmed",
          title: "Payment confirmed",
          body: "Thanks — your payment went through and your project is now in progress.",
          actionUrl: `/projects/${projectId}`,
        });
      } catch (dbError) {
        console.error(
          "Creem webhook: failed to record payment/invoice",
          {
            projectId,
            creemPaymentId,
            error: dbError instanceof Error ? dbError.message : dbError,
          }
        );
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Creem webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
