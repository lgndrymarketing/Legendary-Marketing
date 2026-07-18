import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  agencyClients,
  clientPackageEnum,
  clientStatusEnum,
  users,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Agency client roster (Bronze/Gold/Diamond, fees, status). Admin-only —
 * this carries the agency's commercial terms.
 * GET  — all clients (newest first) + portal accounts available for linking.
 * POST — add a client manually. Fees arrive in cents.
 */

const clientSchema = z.object({
  contactName: z.string().min(1).max(255),
  companyName: z.string().min(1).max(255),
  businessType: z.string().max(100).optional(),
  package: z.enum(clientPackageEnum.enumValues),
  setupFee: z.number().int().min(0),
  monthlyFee: z.number().int().min(0),
  partnerCut: z.number().int().min(0).default(0),
  startDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime().nullable().optional(),
  status: z.enum(clientStatusEnum.enumValues).default("active"),
  userId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const [clients, portalUsers] = await Promise.all([
      db
        .select({
          id: agencyClients.id,
          contactName: agencyClients.contactName,
          companyName: agencyClients.companyName,
          businessType: agencyClients.businessType,
          package: agencyClients.package,
          setupFee: agencyClients.setupFee,
          monthlyFee: agencyClients.monthlyFee,
          partnerCut: agencyClients.partnerCut,
          startDate: agencyClients.startDate,
          nextDueDate: agencyClients.nextDueDate,
          status: agencyClients.status,
          userId: agencyClients.userId,
          notes: agencyClients.notes,
          portalEmail: users.email,
        })
        .from(agencyClients)
        .leftJoin(users, eq(agencyClients.userId, users.id))
        .orderBy(desc(agencyClients.createdAt)),
      db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.role, "client")),
    ]);

    return NextResponse.json({ clients, portalUsers });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Clients fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const parsed = clientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid client", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { startDate, nextDueDate, ...rest } = parsed.data;

    const [created] = await db
      .insert(agencyClients)
      .values({
        ...rest,
        startDate: startDate ? new Date(startDate) : new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        createdBy: admin.id,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Client create error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
