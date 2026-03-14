CREATE TABLE "set_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"max_new_card_fails_per_day" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "max_new_card_fails_per_day" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "set_settings" ADD CONSTRAINT "set_settings_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "set_settings_set_id_idx" ON "set_settings" USING btree ("set_id");