CREATE TABLE "bundle_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"novelty" integer NOT NULL,
	"worldview_fidelity" integer NOT NULL,
	"interpretive_depth" integer NOT NULL,
	"quote_leakage_risk" integer NOT NULL,
	"usefulness" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_id" uuid,
	"aphorism" text NOT NULL,
	"counter_aphorism" text NOT NULL,
	"gloss" text NOT NULL,
	"reversal" text NOT NULL,
	"hostile_reading" text NOT NULL,
	"provenance" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"query" text,
	"filters" jsonb,
	"thought_object_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairwise_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"left_bundle_id" uuid NOT NULL,
	"right_bundle_id" uuid NOT NULL,
	"preferred_bundle_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thought_object_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_thought_object_id" uuid NOT NULL,
	"to_thought_object_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "status" text DEFAULT 'raw' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "worldview_coordinates" jsonb;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "embedding" vector(8);--> statement-breakpoint
ALTER TABLE "bundle_evaluations" ADD CONSTRAINT "bundle_evaluations_bundle_id_generation_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."generation_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_bundles" ADD CONSTRAINT "generation_bundles_context_id_generation_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."generation_contexts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_left_bundle_id_generation_bundles_id_fk" FOREIGN KEY ("left_bundle_id") REFERENCES "public"."generation_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_right_bundle_id_generation_bundles_id_fk" FOREIGN KEY ("right_bundle_id") REFERENCES "public"."generation_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_preferred_bundle_id_generation_bundles_id_fk" FOREIGN KEY ("preferred_bundle_id") REFERENCES "public"."generation_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD CONSTRAINT "thought_object_relationships_from_thought_object_id_thought_objects_id_fk" FOREIGN KEY ("from_thought_object_id") REFERENCES "public"."thought_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD CONSTRAINT "thought_object_relationships_to_thought_object_id_thought_objects_id_fk" FOREIGN KEY ("to_thought_object_id") REFERENCES "public"."thought_objects"("id") ON DELETE no action ON UPDATE no action;