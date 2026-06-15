CREATE TABLE "source_fragments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_text" text NOT NULL,
	"source_type" text NOT NULL,
	"title" text,
	"author" text,
	"citation" text,
	"url" text,
	"personal_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thought_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_fragment_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worldview_axes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"min_label" text NOT NULL,
	"max_label" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "thought_objects" ADD CONSTRAINT "thought_objects_source_fragment_id_source_fragments_id_fk" FOREIGN KEY ("source_fragment_id") REFERENCES "public"."source_fragments"("id") ON DELETE no action ON UPDATE no action;