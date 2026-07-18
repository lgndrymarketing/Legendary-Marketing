import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// Enums

// Staff roles (tiered access): admin > project_manager > va. Clients use "client".
export const userRoles = ["client", "admin", "project_manager", "va"] as const;
export type UserRole = (typeof userRoles)[number];

export const serviceTypeEnum = pgEnum("service_type", [
  "paid_advertising",
  "funnel_build",
  "website_design",
  "crm_automation",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "onboarding",
  "payment_pending",
  "in_progress",
  "revision",
  "completed",
  "cancelled",
]);

export const phaseStatusEnum = pgEnum("phase_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const messageRoleEnum = pgEnum("message_role", ["client", "admin"]);

export const revisionStatusEnum = pgEnum("revision_status", [
  "pending",
  "in_progress",
  "completed",
  "rejected",
]);

// Users - synced with Clerk
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
  // "client" | "admin" | "project_manager" | "va" — see lib/permissions.ts
  role: varchar("role", { length: 50 }).notNull().default("client"),
  // GoHighLevel contact sync (client-side users only)
  ghlContactId: varchar("ghl_contact_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  status: projectStatusEnum("status").notNull().default("onboarding"),
  currentPhase: integer("current_phase").notNull().default(0),
  // GoHighLevel opportunity sync (pipeline/revenue tracking)
  ghlOpportunityId: varchar("ghl_opportunity_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_projects_user_id").on(table.userId),
]);

// Onboarding submissions
export const onboardingSubmissions = pgTable("onboarding_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  targetAudience: text("target_audience"),
  timeline: varchar("timeline", { length: 100 }),
  budget: varchar("budget", { length: 100 }),
  additionalNotes: text("additional_notes"),
  brandColors: text("brand_colors"),
  features: jsonb("features"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_onboarding_project_id").on(table.projectId),
]);

// Project phases
export const projectPhases = pgTable("project_phases", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  status: phaseStatusEnum("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_phases_project_id").on(table.projectId),
]);

// Payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  // Legacy column from the retired Creem checkout flow — kept for old rows.
  creemPaymentId: varchar("creem_payment_id", { length: 255 }).unique(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // Where this payment record originated — synced from the agency's
  // GoHighLevel invoicing/CRM ("ghl") or recorded in the portal.
  source: varchar("source", { length: 20 }).notNull().default("ghl"),
  ghlPaymentId: varchar("ghl_payment_id", { length: 255 }),
  // Free-form admin notes ("wire ref 4421", "50% deposit", …).
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payments_project_id").on(table.projectId),
  index("idx_payments_user_id").on(table.userId),
]);

// Messages
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_messages_project_id").on(table.projectId),
]);

// Files
export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  uploadedBy: uuid("uploaded_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  type: varchar("type", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_files_project_id").on(table.projectId),
]);

// Revision requests
export const revisionRequests = pgTable("revision_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  status: revisionStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_revisions_project_id").on(table.projectId),
]);

// Notifications
export const notificationTypeEnum = pgEnum("notification_type", [
  "phase_update",
  "message_received",
  "revision_response",
  "payment_confirmed",
  "project_completed",
  "file_uploaded",
  "comment_added",
  "survey_request",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  actionUrl: varchar("action_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
]);

// Project comments (thread-based)
export const projectComments = pgTable("project_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_comments_project_id").on(table.projectId),
]);

// Client satisfaction surveys
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(), // 1-10 NPS
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_surveys_project_id").on(table.projectId),
]);

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id")
    .references(() => payments.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  items: jsonb("items").notNull(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("paid"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
}, (table) => [
  index("idx_invoices_user_id").on(table.userId),
  index("idx_invoices_project_id").on(table.projectId),
]);

// Analytics events (client-facing)
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  value: integer("value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_analytics_project_id").on(table.projectId),
]);

// Leads — captured from the public site (contact form, get-started funnel)
// and synced into GoHighLevel, which is the agency's CRM of record.
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  serviceInterest: varchar("service_interest", { length: 100 }),
  monthlyBudget: varchar("monthly_budget", { length: 100 }),
  message: text("message"),
  // Where the lead came from: "contact_form" | "get_started_funnel" | ...
  source: varchar("source", { length: 100 }).notNull().default("contact_form"),
  status: leadStatusEnum("status").notNull().default("new"),
  ghlContactId: varchar("ghl_contact_id", { length: 255 }),
  ghlSyncedAt: timestamp("ghl_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_leads_email").on(table.email),
  index("idx_leads_status").on(table.status),
]);

// Ad campaigns — the campaigns the agency runs for a client project.
// Metrics are agency-entered for now; ghlCampaignId reserves the link for
// pulling attribution/reporting out of GoHighLevel later.
export const campaignPlatformEnum = pgEnum("campaign_platform", [
  "meta",
  "google",
  "tiktok",
  "other",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);

export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: campaignPlatformEnum("platform").notNull(),
  status: campaignStatusEnum("status").notNull().default("draft"),
  // Money in cents
  monthlyBudget: integer("monthly_budget"),
  totalSpend: integer("total_spend").notNull().default(0),
  leadsGenerated: integer("leads_generated").notNull().default(0),
  notes: text("notes"),
  ghlCampaignId: varchar("ghl_campaign_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_campaigns_project_id").on(table.projectId),
]);

// Task board (kanban) — internal team task management per project
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  order: integer("order").notNull().default(0),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tasks_project_id").on(table.projectId),
  index("idx_tasks_assignee_id").on(table.assigneeId),
]);

// Expenses — agency operating costs (SaaS subscriptions, team/contractor pay,
// platform fees, ad spend). Feeds the Financials cost/profit metrics.
export const expenseCategoryEnum = pgEnum("expense_category", [
  "saas",
  "team",
  "fees",
  "ads",
  "other",
]);

export const expenseCadenceEnum = pgEnum("expense_cadence", [
  "one_time",
  "monthly",
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: expenseCategoryEnum("category").notNull().default("other"),
  // Money in cents. Monthly-cadence expenses recur every month from incurredAt.
  amount: integer("amount").notNull(),
  cadence: expenseCadenceEnum("cadence").notNull().default("one_time"),
  incurredAt: timestamp("incurred_at").defaultNow().notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_expenses_incurred_at").on(table.incurredAt),
]);

// Partner ledger — tracks profit splits between the agency's admins.
// "credit" allocates a share of profit to a partner; "payout" records money
// actually paid out to them. Balance = sum(credits) - sum(payouts).
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "credit",
  "payout",
]);

export const partnerLedgerEntries = pgTable("partner_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnerId: uuid("partner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  // Money in cents, always positive; entryType carries the direction.
  amount: integer("amount").notNull(),
  description: text("description"),
  // Optional link back to the client payment this split derives from.
  paymentId: uuid("payment_id").references(() => payments.id, {
    onDelete: "set null",
  }),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ledger_partner_id").on(table.partnerId),
]);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type File = typeof files.$inferSelect;
export type RevisionRequest = typeof revisionRequests.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type OnboardingSubmission = typeof onboardingSubmissions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ProjectComment = typeof projectComments.$inferSelect;
export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type NewAdCampaign = typeof adCampaigns.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type PartnerLedgerEntry = typeof partnerLedgerEntries.$inferSelect;
export type NewPartnerLedgerEntry = typeof partnerLedgerEntries.$inferInsert;
