-- Deny-all Row Level Security on every application table.
--
-- The app connects as the `postgres` role, which bypasses RLS, so this
-- changes nothing for the portal. What it does is close the Supabase anon
-- and authenticated keys, which would otherwise read these tables directly
-- over PostgREST — client emails, fees and payment records included.
--
-- No policies are attached on purpose: RLS with zero policies denies every
-- role that is subject to it. Adding a policy here would grant access, not
-- restrict it.
--
-- This was applied by hand in production before it existed as a migration,
-- so every statement is idempotent and safe to re-run.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "onboarding_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_phases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "revision_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "satisfaction_surveys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agency_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "weekly_reports" ENABLE ROW LEVEL SECURITY;
