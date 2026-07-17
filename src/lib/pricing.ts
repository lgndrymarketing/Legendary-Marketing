import type { ServiceType } from "@/lib/services";

/**
 * Single source of truth for what each service costs at checkout.
 *
 * Amounts are derived from the `startingPrice` strings in `services.ts` and are
 * always expressed in CENTS. Services whose starting price ends in "/mo" are
 * recurring retainers (`billing: "monthly"`); the rest are one-time projects.
 *
 * `lineItems` always sum to `amountCents` so an invoice built from them stays
 * internally consistent.
 */

export type BillingKind = "monthly" | "one_time";

export interface PricingLineItem {
  name: string;
  amountCents: number;
}

export interface ServicePricing {
  label: string;
  amountCents: number;
  billing: BillingKind;
  lineItems: PricingLineItem[];
}

const PRICING: Record<ServiceType, ServicePricing> = {
  paid_advertising: {
    label: "Paid Advertising",
    amountCents: 150000,
    billing: "monthly",
    lineItems: [
      { name: "Ad management retainer", amountCents: 120000 },
      { name: "Platform setup & conversion tracking", amountCents: 30000 },
    ],
  },
  funnel_build: {
    label: "High-Converting Funnels",
    amountCents: 120000,
    billing: "one_time",
    lineItems: [
      { name: "Funnel design & build", amountCents: 90000 },
      { name: "Email & SMS follow-up setup", amountCents: 30000 },
    ],
  },
  website_design: {
    label: "Websites & Landing Pages",
    amountCents: 200000,
    billing: "one_time",
    lineItems: [
      { name: "Website design & development", amountCents: 160000 },
      { name: "SEO fundamentals, hosting & deployment", amountCents: 40000 },
    ],
  },
  crm_automation: {
    label: "CRM & Automation",
    amountCents: 100000,
    billing: "monthly",
    lineItems: [
      { name: "CRM management retainer", amountCents: 70000 },
      { name: "Automation & ROI reporting", amountCents: 30000 },
    ],
  },
};

/**
 * Look up pricing for a service type. Returns `undefined` for an unknown
 * service so callers can fail defensively.
 */
export function getPricing(serviceType: string): ServicePricing | undefined {
  return PRICING[serviceType as ServiceType];
}

/**
 * Format a cents amount as whole US dollars, e.g. 150000 -> "$1,500".
 */
export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}
