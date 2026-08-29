CREATE TABLE "mcp_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"created_by" uuid NOT NULL,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "mcp_keys" ADD CONSTRAINT "mcp_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mcp_keys_hash" ON "mcp_keys" USING btree ("key_hash");--> statement-breakpoint
ALTER TABLE "mcp_keys" ENABLE ROW LEVEL SECURITY;