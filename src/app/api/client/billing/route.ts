import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyClients, clientPayments, users, notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * Client-side billing.
 * GET  — the signed-in client's billing profile (package, fees, next due)
 *        plus their payment history, from the roster record linked to them.
 * POST — "I've sent a payment": notifies every admin so they can verify and
 *        record it. Clients can NOT create payment records directly — that
 *        would let them fabricate ledger entries.
 */

const reportSchema = z.object({
  paymentType: z.enum(["setup_fee", "monthly_retainer"]),
  method: z.string().min(1).max(50),
  note: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const [client] = await db
      .select({
        id: agencyClients.id,
        companyName: agencyClients.companyName,
        package: agencyClients.package,
        packageLabel: agencyClients.packageLabel,
        setupFee: agencyClients.setupFee,
        monthlyFee: agencyClients.monthlyFee,
        startDate: agencyClients.startDate,
        nextDueDate: agencyClients.nextDueDate,
        status: agencyClients.status,
      })
      .from(agencyClients)
      .where(eq(agencyClients.userId, user.id));

    if (!client) {
      return NextResponse.json({ empty: true });
    }

    const history = await db
      .select({
        id: clientPayments.id,
        paymentType: clientPayments.paymentType,
        method: clientPayments.method,
        amount: clientPayments.amount,
        paidAt: clientPayments.paidAt,
      })
      .from(clientPayments)
      .where(eq(clientPayments.clientId, client.id))
      .orderBy(desc(clientPayments.paidAt))
      .limit(100);

    return NextResponse.json({ client, history });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client billing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    const rateLimit = checkRateLimit(user.id + ":billing-report", 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = reportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid report", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { paymentType, method, note } = parsed.data;

    const [client] = await db
      .select({
        id: agencyClients.id,
        companyName: agencyClients.companyName,
        setupFee: agencyClients.setupFee,
        monthlyFee: agencyClients.monthlyFee,
      })
      .from(agencyClients)
      .where(eq(agencyClients.userId, user.id));
    if (!client) {
      return NextResponse.json(
        { error: "No billing profile yet" },
        { status: 400 }
      );
    }

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    const amount =
      paymentType === "setup_fee" ? client.setupFee : client.monthlyFee;
    const label =
      paymentType === "setup_fee" ? "setup fee" : "monthly retainer";
    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map((a) => ({
          userId: a.id,
          type: "payment_confirmed" as const,
          title: `${client.companyName} reports a payment`,
          body: `${client.companyName} says they sent their ${label} ($${Math.round(
            amount / 100
          ).toLocaleString("en-US")}) via ${method}.${note ? ` Note: ${note}` : ""} Verify and record it on the Payments page.`,
          actionUrl: "/admin/payments",
        }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Payment report error:", error);
    return NextResponse.json(
      { error: "Failed to send report" },
      { status: 500 }
    );
  }
}
