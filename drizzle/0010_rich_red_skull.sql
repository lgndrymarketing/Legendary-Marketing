CREATE TYPE "public"."client_task_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."crm_stage" AS ENUM('onboarding_form', 'onboarding_guide', 'crm_access', 'funnel_build_out', 'automations_build_out', 'a2p_submitted', 'a2p_verified', 'ad_creatives', 'launch_form_submitted', 'launch_call_completed', 'ads_campaign_build_out', 'ads_launched');--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('csm', 'funnel', 'automations', 'ads');--> statement-breakpoint
ALTER TYPE "public"."client_package" ADD VALUE 'rev_split' BEFORE 'custom';--> statement-breakpoint
CREATE TABLE "client_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"department" "department",
	"stage" "crm_stage",
	"status" "client_task_status" DEFAULT 'pending' NOT NULL,
	"assignee_id" uuid,
	"assignee_name" varchar(255),
	"order" integer DEFAULT 0 NOT NULL,
	"due_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_clients" ADD COLUMN "stage" "crm_stage" DEFAULT 'onboarding_form' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_clients" ADD COLUMN "saas_plan" varchar(100);--> statement-breakpoint
ALTER TABLE "agency_clients" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "agency_clients" ADD COLUMN "drive_url" text;--> statement-breakpoint
ALTER TABLE "agency_clients" ADD COLUMN "landing_page_url" text;--> statement-breakpoint
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_client_id_agency_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_client_tasks_client_id" ON "client_tasks" USING btree ("client_id");