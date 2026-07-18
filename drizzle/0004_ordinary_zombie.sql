CREATE TYPE "public"."client_package" AS ENUM('bronze', 'gold', 'diamond');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'paused', 'churned');--> statement-breakpoint
CREATE TABLE "agency_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"business_type" varchar(100),
	"package" "client_package" DEFAULT 'bronze' NOT NULL,
	"setup_fee" integer DEFAULT 0 NOT NULL,
	"monthly_fee" integer DEFAULT 0 NOT NULL,
	"partner_cut" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"next_due_date" timestamp,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"user_id" uuid,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agency_clients_status" ON "agency_clients" USING btree ("status");