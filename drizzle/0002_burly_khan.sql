CREATE TABLE "iteration_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"media_item_ids" jsonb NOT NULL,
	"thought_object_ids" jsonb NOT NULL,
	"current_draft" text NOT NULL,
	"history" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"file_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"data_url" text,
	"extracted_text" text,
	"metadata" jsonb NOT NULL,
	"source_fragment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_source_fragment_id_source_fragments_id_fk" FOREIGN KEY ("source_fragment_id") REFERENCES "public"."source_fragments"("id") ON DELETE no action ON UPDATE no action;