CREATE TYPE "public"."weekly_report_status" AS ENUM('pending_client', 'completed');--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"week_start" timestamp NOT NULL,
	"week_end" timestamp NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"cpl" integer DEFAULT 0 NOT NULL,
	"total_spend" integer DEFAULT 0 NOT NULL,
	"closes" integer,
	"revenue" integer,
	"status" "weekly_report_status" DEFAULT 'pending_client' NOT NULL,
	"created_by" uuid,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_client_id_agency_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_weekly_reports_client_id" ON "weekly_reports" USING btree ("client_id");