import {
  Megaphone,
  Filter,
  Globe,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type ServiceType =
  | "paid_advertising"
  | "funnel_build"
  | "website_design"
  | "crm_automation";

export interface Service {
  id: ServiceType;
  name: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  startingPrice: string;
}

export const services: Service[] = [
  {
    id: "paid_advertising",
    name: "Paid Advertising",
    description:
      "Full-funnel media buying across Meta, Google, and TikTok — built to drive qualified leads and sales, not just clicks.",
    icon: Megaphone,
    features: [
      "Meta, Google & TikTok Ads management",
      "Creative strategy & ad copy",
      "Audience research & targeting",
      "Weekly performance reporting",
      "Conversion tracking & pixel setup",
    ],
    startingPrice: "Starting at $1,500/mo",
  },
  {
    id: "funnel_build",
    name: "High-Converting Funnels",
    description:
      "A dedicated funnel to turn ad traffic into booked calls and paying customers — built, tested, and optimized for conversion.",
    icon: Filter,
    features: [
      "Landing page design",
      "Multi-step lead capture",
      "A/B testing ready",
      "Email & SMS follow-up sequences",
      "Analytics & conversion tracking",
    ],
    startingPrice: "Starting at $1,200",
  },
  {
    id: "website_design",
    name: "Websites & Landing Pages",
    description:
      "A fast, on-brand site that supports your ad campaigns and converts visitors — from a single landing page to a full site rebuild.",
    icon: Globe,
    features: [
      "Custom UI/UX design",
      "Mobile-first & fast-loading",
      "SEO fundamentals",
      "CMS for easy updates",
      "Hosting & deployment",
    ],
    startingPrice: "Starting at $2,000",
  },
  {
    id: "crm_automation",
    name: "CRM & Automation",
    description:
      "We set up and manage your GoHighLevel pipeline — lead routing, follow-up automation, and reporting so no lead falls through the cracks.",
    icon: Workflow,
    features: [
      "GoHighLevel setup & configuration",
      "Pipeline & opportunity tracking",
      "Automated follow-up sequences",
      "Appointment booking automation",
      "Revenue & ROI reporting",
    ],
    startingPrice: "Starting at $1,000/mo",
  },
];

export const serviceLabels: Record<string, string> = Object.fromEntries(
  services.map((s) => [s.id, s.name])
);

export const projectPhaseNames = [
  "Discovery",
  "Strategy & Setup",
  "Build & Launch",
  "Optimization",
  "Review",
  "Scale",
];
