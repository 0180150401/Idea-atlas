import { boolean, integer, jsonb, pgTable, real, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  jobType: text('job_type').notNull(),
  status: text('status').notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  error: text('error'),
  result: jsonb('result').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const metadataExtractions = pgTable('metadata_extractions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceFragmentId: uuid('source_fragment_id')
    .notNull()
    .references(() => sourceFragments.id),
  thoughtObjectId: uuid('thought_object_id').references(() => thoughtObjects.id),
  method: text('method').notNull(),
  provider: text('provider'),
  model: text('model'),
  schemaVersion: text('schema_version').notNull().default('v1'),
  rawOutput: jsonb('raw_output').$type<Record<string, unknown>>(),
  normalizedOutput: jsonb('normalized_output').$type<Record<string, unknown>>(),
  confidence: real('confidence'),
  warnings: jsonb('warnings').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  family: text('family').notNull(),
  label: text('label').notNull(),
  canonicalKey: text('canonical_key').notNull().unique(),
  definition: text('definition'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const thoughtObjectTags = pgTable('thought_object_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  thoughtObjectId: uuid('thought_object_id')
    .notNull()
    .references(() => thoughtObjects.id),
  tagId: uuid('tag_id')
    .notNull()
    .references(() => tags.id),
  confidence: real('confidence').notNull().default(0.5),
  source: text('source').notNull().default('inferred'),
  evidence: text('evidence'),
  lifecycleState: text('lifecycle_state').notNull().default('suggested'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const generationRuns = pgTable('generation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: text('status').notNull().default('queued'),
  trigger: text('trigger').notNull().default('automatic'),
  contextSnapshot: jsonb('context_snapshot').$type<Record<string, unknown>>().notNull(),
  routeStrategy: text('route_strategy'),
  qualityThresholds: jsonb('quality_thresholds').$type<Record<string, unknown>>(),
  outputPlan: jsonb('output_plan').$type<Record<string, unknown>[]>(),
  bundleIds: jsonb('bundle_ids').$type<string[]>().notNull().default([]),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const generationBundleQuality = pgTable('generation_bundle_quality', {
  id: uuid('id').primaryKey().defaultRandom(),
  bundleId: uuid('bundle_id')
    .notNull()
    .references(() => generationBundles.id),
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id),
  status: text('status').notNull().default('pending'),
  quoteLeakageRisk: integer('quote_leakage_risk').notNull().default(3),
  sourceMimicryRisk: integer('source_mimicry_risk').notNull().default(3),
  falseLineageRisk: integer('false_lineage_risk').notNull().default(3),
  genericProfundityRisk: integer('generic_profundity_risk').notNull().default(3),
  tensionFlatteningRisk: integer('tension_flattening_risk').notNull().default(3),
  provenanceCoverage: integer('provenance_coverage').notNull().default(3),
  flags: jsonb('flags').$type<string[]>().notNull().default([]),
  guidance: text('guidance'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sourceFragments = pgTable('source_fragments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rawText: text('raw_text').notNull(),
  sourceType: text('source_type').notNull(), // book | article | personal | web | other
  title: text('title'),
  author: text('author'),
  citation: text('citation'),
  url: text('url'),
  personalContext: text('personal_context'),
  fragmentType: text('fragment_type').notNull().default('pasted-text'),
  canonRelationship: text('canon_relationship'),
  isPromoted: boolean('is_promoted').notNull().default(false),
  inferredMetadata: jsonb('inferred_metadata').$type<{
    title?: string
    author?: string
    sourceHints?: string
    genreForm?: string
    keywords?: string[]
    motifs?: string[]
    domains?: string[]
    rhetoric?: string[]
    affectiveRegister?: string
    provenance?: string
    quoteLeak?: string
    factual?: Record<string, unknown>
    textual?: Record<string, unknown>
    interpretive?: Record<string, unknown>
    evidence?: Record<string, { value: unknown; confidence: number; snippet?: string }>
    generationReadinessScore?: number
  }>(),
  processingState: text('processing_state').notNull().default('queued'),
  generationReadiness: text('generation_readiness').notNull().default('blocked'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const thoughtObjects = pgTable('thought_objects', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceFragmentId: uuid('source_fragment_id')
    .notNull()
    .references(() => sourceFragments.id),
  rawText: text('raw_text').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  status: text('status').notNull().default('raw'), // raw | structured | embedded | ready
  processingState: text('processing_state').notNull().default('queued'),
  generationReadiness: text('generation_readiness').notNull().default('blocked'),
  worldviewCoordinates: jsonb('worldview_coordinates').$type<Record<string, number>>(),
  embedding: vector('embedding', { dimensions: 8 }),
  embeddingV2: vector('embedding_v2', { dimensions: 1536 }),
  artifactType: text('artifact_type').notNull().default('source'),
  lineage: jsonb('lineage').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const worldviewAxes = pgTable('worldview_axes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  minLabel: text('min_label').notNull(),
  maxLabel: text('max_label').notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete only
})

export const thoughtObjectRelationships = pgTable('thought_object_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromThoughtObjectId: uuid('from_thought_object_id')
    .notNull()
    .references(() => thoughtObjects.id),
  toThoughtObjectId: uuid('to_thought_object_id')
    .notNull()
    .references(() => thoughtObjects.id),
  type: text('type').notNull(),
  confidence: real('confidence'),
  evidence: text('evidence'),
  inferenceSource: text('inference_source'),
  lifecycleState: text('lifecycle_state').notNull().default('suggested'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const generationContexts = pgTable('generation_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  query: text('query'),
  filters: jsonb('filters').$type<Record<string, unknown>>(),
  thoughtObjectIds: jsonb('thought_object_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const generationBundles = pgTable('generation_bundles', {
  id: uuid('id').primaryKey().defaultRandom(),
  contextId: uuid('context_id').references(() => generationContexts.id),
  aphorism: text('aphorism').notNull(),
  counterAphorism: text('counter_aphorism').notNull(),
  gloss: text('gloss').notNull(),
  reversal: text('reversal').notNull(),
  hostileReading: text('hostile_reading').notNull(),
  provenance: jsonb('provenance').$type<Record<string, unknown>[]>().notNull(),
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id),
  acceptanceState: text('acceptance_state').notNull().default('draft'),
  qualityStatus: text('quality_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bundleEvaluations = pgTable('bundle_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  bundleId: uuid('bundle_id')
    .notNull()
    .references(() => generationBundles.id),
  novelty: integer('novelty').notNull(),
  worldviewFidelity: integer('worldview_fidelity').notNull(),
  interpretiveDepth: integer('interpretive_depth').notNull(),
  quoteLeakageRisk: integer('quote_leakage_risk').notNull(),
  usefulness: integer('usefulness').notNull(),
  transformativeOriginality: integer('transformative_originality').notNull().default(3),
  rhetoricalForce: integer('rhetorical_force').notNull().default(3),
  imagePrecision: integer('image_precision').notNull().default(3),
  intertextualIntegrity: integer('intertextual_integrity').notNull().default(3),
  stylisticDistinctiveness: integer('stylistic_distinctiveness').notNull().default(3),
  constraintAdherence: integer('constraint_adherence').notNull().default(3),
  revisionUsefulness: integer('revision_usefulness').notNull().default(3),
  genericProfundityRisk: integer('generic_profundity_risk').notNull().default(3),
  sourceMimicryRisk: integer('source_mimicry_risk').notNull().default(3),
  falseLineageRisk: integer('false_lineage_risk').notNull().default(3),
  tensionFlatteningRisk: integer('tension_flattening_risk').notNull().default(3),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const pairwiseComparisons = pgTable('pairwise_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  leftBundleId: uuid('left_bundle_id')
    .notNull()
    .references(() => generationBundles.id),
  rightBundleId: uuid('right_bundle_id')
    .notNull()
    .references(() => generationBundles.id),
  preferredBundleId: uuid('preferred_bundle_id')
    .notNull()
    .references(() => generationBundles.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const mediaItems = pgTable('media_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(), // text | image | audio | video | document | other
  fileName: text('file_name'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  dataUrl: text('data_url'),
  extractedText: text('extracted_text'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
  sourceFragmentId: uuid('source_fragment_id').references(() => sourceFragments.id),
  processingState: text('processing_state').notNull().default('queued'),
  generationReadiness: text('generation_readiness').notNull().default('blocked'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const iterationSessions = pgTable('iteration_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  mediaItemIds: jsonb('media_item_ids').$type<string[]>().notNull(),
  thoughtObjectIds: jsonb('thought_object_ids').$type<string[]>().notNull(),
  currentDraft: text('current_draft').notNull(),
  history: jsonb('history').$type<Record<string, unknown>[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
