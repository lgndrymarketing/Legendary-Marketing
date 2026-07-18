CREATE TYPE "public"."client_payment_type" AS ENUM('setup_fee', 'monthly_retainer');--> statement-breakpoint
CREATE TYPE "public"."split_status" AS ENUM('pending', 'settled');--> statement-breakpoint
CREATE TABLE "client_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"payment_type" "client_payment_type" NOT NULL,
	"method" varchar(50) DEFAULT 'zelle' NOT NULL,
	"amount" integer NOT NULL,
	"partner_cut" integer DEFAULT 0 NOT NULL,
	"received_by" uuid,
	"split_status" "split_status" DEFAULT 'pending' NOT NULL,
	"settled_at" timestamp,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_client_id_agency_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_client_payments_client_id" ON "client_payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_payments_split_status" ON "client_payments" USING btree ("split_status");