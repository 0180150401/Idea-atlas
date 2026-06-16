ALTER TABLE "source_fragments" ADD COLUMN "fragment_type" text DEFAULT 'pasted-text' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_fragments" ADD COLUMN "canon_relationship" text;--> statement-breakpoint
ALTER TABLE "source_fragments" ADD COLUMN "is_promoted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "source_fragments" ADD COLUMN "inferred_metadata" jsonb;