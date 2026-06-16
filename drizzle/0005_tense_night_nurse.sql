CREATE TABLE "generation_bundle_quality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"generation_run_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"quote_leakage_risk" integer DEFAULT 3 NOT NULL,
	"source_mimicry_risk" integer DEFAULT 3 NOT NULL,
	"false_lineage_risk" integer DEFAULT 3 NOT NULL,
	"generic_profundity_risk" integer DEFAULT 3 NOT NULL,
	"tension_flattening_risk" integer DEFAULT 3 NOT NULL,
	"provenance_coverage" integer DEFAULT 3 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guidance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"trigger" text DEFAULT 'automatic' NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"route_strategy" text,
	"quality_thresholds" jsonb,
	"output_plan" jsonb,
	"bundle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "metadata_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_fragment_id" uuid NOT NULL,
	"thought_object_id" uuid,
	"method" text NOT NULL,
	"provider" text,
	"model" text,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"raw_output" jsonb,
	"normalized_output" jsonb,
	"confidence" real,
	"warnings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"idempotency_key" text NOT NULL,
	"error" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "processing_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family" text NOT NULL,
	"label" text NOT NULL,
	"canonical_key" text NOT NULL,
	"definition" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_canonical_key_unique" UNIQUE("canonical_key")
);
--> statement-breakpoint
CREATE TABLE "thought_object_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thought_object_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"source" text DEFAULT 'inferred' NOT NULL,
	"evidence" text,
	"lifecycle_state" text DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_bundles" ADD COLUMN "generation_run_id" uuid;--> statement-breakpoint
ALTER TABLE "generation_bundles" ADD COLUMN "acceptance_state" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_bundles" ADD COLUMN "quality_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "processing_state" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "generation_readiness" text DEFAULT 'blocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_fragments" ADD COLUMN "processing_state" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_fragments" ADD COLUMN "generation_readiness" text DEFAULT 'blocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD COLUMN "evidence" text;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD COLUMN "inference_source" text;--> statement-breakpoint
ALTER TABLE "thought_object_relationships" ADD COLUMN "lifecycle_state" text DEFAULT 'suggested' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "processing_state" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "generation_readiness" text DEFAULT 'blocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "embedding_v2" vector(1536);--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "artifact_type" text DEFAULT 'source' NOT NULL;--> statement-breakpoint
ALTER TABLE "thought_objects" ADD COLUMN "lineage" jsonb;--> statement-breakpoint
ALTER TABLE "generation_bundle_quality" ADD CONSTRAINT "generation_bundle_quality_bundle_id_generation_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."generation_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_bundle_quality" ADD CONSTRAINT "generation_bundle_quality_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metadata_extractions" ADD CONSTRAINT "metadata_extractions_source_fragment_id_source_fragments_id_fk" FOREIGN KEY ("source_fragment_id") REFERENCES "public"."source_fragments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metadata_extractions" ADD CONSTRAINT "metadata_extractions_thought_object_id_thought_objects_id_fk" FOREIGN KEY ("thought_object_id") REFERENCES "public"."thought_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_object_tags" ADD CONSTRAINT "thought_object_tags_thought_object_id_thought_objects_id_fk" FOREIGN KEY ("thought_object_id") REFERENCES "public"."thought_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_object_tags" ADD CONSTRAINT "thought_object_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_bundles" ADD CONSTRAINT "generation_bundles_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;