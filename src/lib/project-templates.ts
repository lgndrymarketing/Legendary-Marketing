import type { ServiceType } from "./services";

export interface ProjectTemplate {
  serviceType: ServiceType;
  name: string;
  description: string;
  suggestedFields: {
    businessName: string;
    industry: string;
    description: string;
    targetAudience: string;
    timeline: string;
    budget: string;
    features: string[];
  };
}

export const projectTemplates: ProjectTemplate[] = [
  {
    serviceType: "paid_advertising",
    name: "Meta Ads Launch",
    description: "Full-funnel Meta (Facebook/Instagram) ad campaign setup",
    suggestedFields: {
      businessName: "",
      industry: "E-commerce / DTC",
      description: "A Meta Ads campaign covering audience research, creative production, pixel/conversion setup, and ongoing optimization to drive qualified leads and sales.",
      targetAudience: "Your ideal customer in [your niche]",
      timeline: "2-3 weeks to launch, ongoing management",
      budget: "$1,500 - $3,000/mo",
      features: ["Audience research", "Ad creative", "Pixel setup", "A/B testing", "Weekly reporting"],
    },
  },
  {
    serviceType: "paid_advertising",
    name: "Google Search & Performance Max",
    description: "Google Ads campaign for high-intent search traffic",
    suggestedFields: {
      businessName: "",
      industry: "Local Service / B2B",
      description: "A Google Ads program combining Search and Performance Max campaigns to capture high-intent traffic, with conversion tracking and monthly optimization.",
      targetAudience: "People actively searching for [your service]",
      timeline: "1-2 weeks to launch, ongoing management",
      budget: "$1,500 - $2,500/mo",
      features: ["Keyword research", "Search campaigns", "Performance Max", "Conversion tracking", "Monthly reporting"],
    },
  },
  {
    serviceType: "funnel_build",
    name: "Lead Generation Funnel",
    description: "Capture leads with a multi-step form and follow-up sequences",
    suggestedFields: {
      businessName: "",
      industry: "Marketing / B2B",
      description: "A high-converting lead generation funnel with a landing page, multi-step qualification form, lead magnet delivery, and automated follow-up sequences.",
      targetAudience: "Business owners and decision makers in [your niche]",
      timeline: "2-3 weeks",
      budget: "$1,200 - $2,000",
      features: ["Landing page", "Multi-step form", "Lead magnet", "Follow-up sequences", "CRM integration", "Analytics"],
    },
  },
  {
    serviceType: "funnel_build",
    name: "Webinar Registration Funnel",
    description: "Drive webinar signups with countdown and reminders",
    suggestedFields: {
      businessName: "",
      industry: "Education / Coaching",
      description: "A webinar registration funnel with a compelling landing page, countdown timer, registration form, confirmation page, and automated reminder sequences.",
      targetAudience: "Professionals interested in [your webinar topic]",
      timeline: "1-2 weeks",
      budget: "$1,200 - $1,800",
      features: ["Landing page", "Countdown timer", "Registration form", "Confirmation page", "Reminder sequences"],
    },
  },
  {
    serviceType: "funnel_build",
    name: "Booked Call Funnel",
    description: "Turn ad clicks into booked sales calls",
    suggestedFields: {
      businessName: "",
      industry: "Coaching / High-Ticket Services",
      description: "An application-style funnel that qualifies leads and books them directly onto your sales calendar, with reminder and no-show follow-up sequences.",
      targetAudience: "Qualified prospects ready to talk to sales",
      timeline: "2-3 weeks",
      budget: "$1,500 - $2,500",
      features: ["Application form", "Calendar booking", "Qualification logic", "Reminder sequences", "No-show follow-up"],
    },
  },
  {
    serviceType: "website_design",
    name: "Brand Website",
    description: "A modern marketing site that supports your ad campaigns",
    suggestedFields: {
      businessName: "",
      industry: "Professional Services",
      description: "A fast, on-brand marketing website with clear calls-to-action, built to convert paid traffic and support SEO.",
      targetAudience: "Prospective customers researching [your business]",
      timeline: "3-4 weeks",
      budget: "$2,000 - $3,500",
      features: ["Custom design", "Mobile-first", "SEO fundamentals", "CMS", "Analytics"],
    },
  },
  {
    serviceType: "crm_automation",
    name: "GoHighLevel Pipeline Setup",
    description: "Full CRM buildout with automated lead follow-up",
    suggestedFields: {
      businessName: "",
      industry: "Any",
      description: "A GoHighLevel setup including pipeline stages, automated follow-up sequences (SMS/email), appointment booking, and revenue reporting synced to your dashboard.",
      targetAudience: "Inbound leads from ads and organic channels",
      timeline: "1-2 weeks",
      budget: "$1,000 - $2,000/mo",
      features: ["Pipeline setup", "Automated follow-up", "Appointment booking", "Lead routing", "Revenue reporting"],
    },
  },
];

export function getTemplatesForService(serviceType: ServiceType): ProjectTemplate[] {
  return projectTemplates.filter((t) => t.serviceType === serviceType);
}
