CREATE TYPE "public"."client_task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "client_tasks" ADD COLUMN "priority" "client_task_priority" DEFAULT 'medium' NOT NULL;