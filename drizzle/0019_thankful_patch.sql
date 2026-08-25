CREATE TYPE "public"."client_resource_kind" AS ENUM('guide', 'tutorial');--> statement-breakpoint
CREATE TABLE "client_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "client_resource_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"body" text,
	"video_url" text,
	"duration" varchar(20),
	"track" varchar(100),
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_client_resources_kind" ON "client_resources" USING btree ("kind");