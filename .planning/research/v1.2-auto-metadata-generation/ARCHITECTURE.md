# Architecture: v1.2 Auto Metadata, Tagging, and Generation Quality

**Milestone:** v1.2 - Improve automatic metadata, tagging, and content generation quality  
**Repository:** `/Users/sebroda/Idea-atlas`  
**Researched:** 2026-06-16  
**Confidence:** HIGH for current architecture, MEDIUM for proposed background-processing details until implementation constraints are chosen

## Executive Recommendation

v1.2 should not introduce a separate "AI metadata service" beside the current app. It should deepen the existing vertical loop:

1. Upload material through `/api/fragments` or `/api/media-items`.
2. Persist a `source_fragments` row as the provenance anchor.
3. Create one or more `thought_objects` as memory nodes.
4. Queue enrichment jobs that improve metadata, tags, worldview coordinates, embeddings, relationships, and generation readiness.
5. Let Memory/Brain read enriched thought objects and relationship edges.
6. Let Generated Content read a stable automatic generation run rather than firing ad hoc generation requests on page load.

The key architectural shift is from "synchronous heuristics at write time" to "synchronous durable ingest plus asynchronous enrichment." The synchronous request should guarantee that the uploaded material is saved and visible. Everything expensive, retryable, or quality-sensitive should move into tracked background jobs.

## Current Architecture

### Existing Data Flow

```text
Manual text upload
  -> POST /api/fragments
  -> source_fragments row with inferredMetadata
  -> one thought_objects row with heuristic metadata + 8-d embedding
  -> Memory/Brain reads /api/thought-objects + /api/relationships
  -> Generated Content calls /api/generate repeatedly on page load
  -> generation_bundles rows

Media upload
  -> POST /api/media-items
  -> media_items row
  -> source_fragments row
  -> one thought_objects row
  -> same graph + generation surfaces
```

### Existing Component Boundaries

| Component | Current responsibility | v1.2 direction |
|---|---|---|
| `db/schema.ts` | Stores fragments, thought objects, relationships, generation contexts, bundles, evaluations, media items, sessions | Add explicit enrichment/generation state, quality scores, normalized tags, and job tracking |
| `lib/atlas.ts` | Local heuristic metadata, embeddings, media metadata, prompts, bundle drafting | Split into deterministic helpers plus orchestration-facing enrich/generate contracts |
| `pages/api/fragments/index.ts` | Creates source fragment and thought object synchronously | Keep durable ingest synchronous; enqueue enrichment |
| `pages/api/media-items/index.ts` | Creates media item, source fragment, thought object synchronously | Keep durable ingest synchronous; enqueue media extraction/enrichment |
| `pages/api/thought-objects/index.ts` | Lists graph-ready thought objects | Expose enrichment status, quality, tags, and generation readiness |
| `pages/api/generate.ts` | Generates a bundle from supplied IDs or recent fallback thoughts | Support automatic grid runs, quality gates, and idempotent generation jobs |
| `pages/workshop.tsx` / `pages/generated.tsx` | On mount, generates multiple boxes via `/api/generate` | Read latest automatic generation run; provide explicit refresh/regenerate action |
| `pages/memory.tsx` + `src/svelte/MemoryGraph.svelte` | View-only graph of thought objects and relationships | Visualize processing status, tags, quality, and inferred relationships |

## New vs Modified Components

### New Components

#### `processing_jobs`

Add a generic job table for asynchronous, retryable work. This is the backbone of the milestone.

Recommended fields:

- `id`
- `kind`: `metadata_enrichment`, `tagging`, `embedding`, `relationship_inference`, `media_extraction`, `generation_grid`, `generation_quality_eval`
- `entityType`: `source_fragment`, `thought_object`, `media_item`, `generation_run`, `generation_bundle`
- `entityId`
- `status`: `queued`, `running`, `succeeded`, `failed`, `skipped`
- `priority`
- `attempts`
- `lastError`
- `inputSnapshot` JSONB
- `outputSummary` JSONB
- `createdAt`, `startedAt`, `finishedAt`, `updatedAt`

Why: current APIs do enrichment inline. That is fine for heuristics but brittle once metadata quality improves through model calls, larger extraction, relationship inference, or multiple generation variants.

#### `tags`

Add normalized tags while preserving JSON metadata on thought objects.

Recommended fields:

- `id`
- `name`
- `kind`: `domain`, `motif`, `rhetoric`, `affect`, `worldview`, `form`, `source`, `quality`
- `description`
- `createdAt`

Why: `metadata.domains`, `inferredMetadata.motifs`, and `metadata.rhetoric` are currently arrays inside JSON. That is good for quick iteration but weak for filtering, graph grouping, deduplication, and generation context assembly.

#### `thought_object_tags`

Join normalized tags to thought objects.

Recommended fields:

- `id`
- `thoughtObjectId`
- `tagId`
- `confidence`: numeric or integer percentage
- `source`: `heuristic`, `model`, `user`, `import`
- `evidence`: JSONB with quoted snippets, rule names, or model rationale
- `createdAt`

Why: the graph and generator need explainable tags. Tag confidence matters because automatic metadata should be inspectable, not silently authoritative.

#### `metadata_extractions`

Store extraction attempts separately from the canonical `thought_objects.metadata` and `source_fragments.inferredMetadata`.

Recommended fields:

- `id`
- `sourceFragmentId`
- `thoughtObjectId`
- `mediaItemId`
- `extractor`: `local_heuristic_v1`, `model_v1`, `ocr_v1`, etc.
- `status`
- `rawOutput` JSONB
- `normalizedOutput` JSONB
- `confidence` JSONB
- `warnings` JSONB
- `createdAt`

Why: provenance requires original wording to remain separate from extracted metadata. Extraction attempts should be auditable and replaceable without overwriting the source.

#### `generation_runs`

Add a parent record for the automatic generated grid.

Recommended fields:

- `id`
- `trigger`: `upload`, `manual_refresh`, `scheduled`, `evaluation_feedback`
- `status`: `queued`, `running`, `succeeded`, `failed`, `partial`
- `contextSnapshot` JSONB
- `modePlan` JSONB
- `qualityThresholds` JSONB
- `createdBundleIds` JSONB
- `createdAt`, `finishedAt`

Why: `pages/workshop.tsx` currently generates six bundles every time the page boots. That creates side effects from a read-oriented page and makes output hard to reason about. A run gives the grid a durable identity.

#### `generation_bundle_quality`

Keep user-facing `bundle_evaluations`, but add automatic quality checks per generated bundle.

Recommended fields:

- `id`
- `bundleId`
- `runId`
- `noveltyScore`
- `quoteLeakageRisk`
- `sourceMimicryRisk`
- `tensionPreservation`
- `provenanceCoverage`
- `genericProfundityRisk`
- `passed`
- `signals` JSONB
- `createdAt`

Why: current `bundleEvaluations` supports manual scoring and guidance. v1.2 needs automatic quality gating before a box appears in the generated grid.

### Modified Components

#### `source_fragments`

Keep as the provenance anchor. Add only processing summary fields:

- `processingStatus`: `queued`, `processing`, `ready`, `failed`, `partial`
- `metadataQuality`: integer or numeric
- `lastProcessedAt`

Do not move original text, title, author, citation, URL, or personal context into model-derived tables. These fields are canonical user/source data.

#### `thought_objects`

Keep one thought object per memory node initially. Add:

- `metadataStatus`: `heuristic`, `enriching`, `enriched`, `needs_review`, `failed`
- `generationReady`: boolean
- `qualitySignals`: JSONB
- `embeddingModel`: text
- `embeddingUpdatedAt`

The existing `status` field can remain for broad lifecycle (`raw`, `structured`, `embedded`, `ready`), but v1.2 needs a more specific metadata/generation readiness signal so the graph and generator do not treat all `ready` nodes as equally reliable.

#### `thought_object_relationships`

Add:

- `confidence`
- `source`: `user`, `heuristic`, `model`
- `evidence` JSONB
- `status`: `suggested`, `accepted`, `rejected`

Current relationship types are sufficient for v1.2: `supports`, `rebuts`, `extends`, `inverts`, `descends_from`. Do not add a graph database yet. The project constraint explicitly favors relational edges in v1.

#### `generation_contexts`

Add:

- `source`: `manual`, `auto_grid`, `upload_trigger`, `search`
- `selectionStrategy`: text
- `contextQuality` JSONB
- `createdByRunId`

Automatic generation needs to explain why specific thought objects were selected. Store the selection strategy beside the chosen IDs.

#### `generation_bundles`

Add:

- `runId`
- `status`: `draft`, `passed`, `needs_review`, `rejected`
- `qualitySummary` JSONB
- `lineageSummary` JSONB
- `mode`
- `formalConstraint`

The existing provenance JSON should remain, but it should become stricter: every bundle must include thought object IDs, source fragment IDs when available, influence weights, transformation notes, and quality warnings.

#### `media_items`

Add:

- `extractionStatus`
- `extractionWarnings` JSONB
- `derivedThoughtObjectIds` JSONB

Media upload currently creates a placeholder thought object even when extracted text is absent. v1.2 should still create a visible memory node, but media extraction should be tracked as an asynchronous process that can later add text, tags, and richer nodes.

## Data-Flow Changes

### Ingest Flow

```text
POST /api/fragments or POST /api/media-items
  -> validate request
  -> insert source_fragments
  -> insert media_items when applicable
  -> create initial thought_objects node(s)
  -> run cheap local heuristic enrichment inline
  -> insert processing_jobs:
       metadata_enrichment
       tagging
       embedding
       relationship_inference
       generation_grid
  -> return 201 with row + processingStatus
```

The API response should not wait for model-quality enrichment. It should return enough state for the UI to say "saved, processing metadata."

### Enrichment Flow

```text
Worker claims queued processing_jobs
  -> loads source fragment / media item / thought object
  -> runs deterministic extraction first
  -> optionally runs model enrichment
  -> writes metadata_extractions
  -> updates thought_objects.metadata, worldviewCoordinates, embedding
  -> writes tags and thought_object_tags
  -> updates source_fragments.processingStatus
  -> queues relationship_inference when enough nodes exist
```

Canonical metadata should be the normalized best-known projection. Raw extraction outputs should be retained in `metadata_extractions`.

### Relationship Flow

```text
relationship_inference job
  -> load new or changed thought object
  -> compare against candidate thought objects
  -> propose supports/rebuts/extends/inverts/descends_from edges
  -> insert thought_object_relationships with source=model|heuristic, confidence, status=suggested
  -> Memory/Brain renders accepted + high-confidence suggested edges differently
```

For v1.2, use relational candidate selection rather than full graph infrastructure. Candidate selection can start with recent rows, shared tags, and embedding similarity.

### Generation Flow

```text
generation_grid job
  -> select generation-ready thought objects
  -> create generation_run
  -> create one generation_context per grid cell or strategy cluster
  -> generate candidate bundles per mode
  -> run automatic quality checks
  -> store passed bundles as generation_bundles
  -> mark run succeeded/partial
  -> /api/bundles returns latest passed grid bundles
```

The Generated Content page should not create bundles on mount. It should load the latest successful run and offer a refresh button that enqueues a new `generation_grid` job.

## API Changes

### `POST /api/fragments`

Modify:

- Keep current insert behavior.
- Return `{ fragment, thoughtObjects, jobs }` instead of only the fragment row.
- Add optional request flags:
  - `autoProcess?: boolean` default `true`
  - `autoGenerate?: boolean` default `true`
  - `fragmentSplitMode?: "single" | "paragraphs" | "auto"`

New behavior:

- Create initial memory node(s).
- Queue enrichment/tagging/embedding/generation jobs.
- Set `processingStatus`.

### `POST /api/media-items`

Modify:

- Keep source fragment and media item creation.
- Return `{ mediaItem, sourceFragment, thoughtObjects, jobs }`.
- Add optional request flags:
  - `autoExtract?: boolean` default `true`
  - `autoProcess?: boolean` default `true`
  - `autoGenerate?: boolean` default `true`

New behavior:

- If text exists, create a text-backed thought object immediately.
- If no text exists, create a media-backed memory node with `metadataStatus=heuristic`.
- Queue extraction/enrichment jobs.

### `GET /api/thought-objects`

Modify response shape to include:

- `tags`
- `metadataStatus`
- `generationReady`
- `qualitySignals`
- `sourceFragment.processingStatus`

Memory/Brain can remain view-only. It just needs richer graph data.

### `GET /api/relationships`

Add query parameters:

- `includeSuggested=true`
- `minConfidence=0.6`
- `source=user|heuristic|model`

Default should preserve current behavior: return accepted relationships. Memory/Brain can opt into suggested edges.

### `POST /api/generate`

Modify:

- Keep manual generation for selected thought IDs.
- Add `runMode?: "single" | "grid"`.
- Add `qualityGate?: boolean`.
- Add `selectionStrategy?: "recent" | "tag_cluster" | "tension_pair" | "evaluation_feedback"`.

Recommended split:

- Keep `/api/generate` for immediate/manual single-bundle generation.
- Add `/api/generation-runs` for automatic grid creation and status polling.

### New `GET /api/generation-runs/latest`

Return the latest run with passed bundles:

```json
{
  "run": {},
  "bundles": [],
  "status": "succeeded"
}
```

### New `POST /api/generation-runs`

Enqueue or execute an automatic grid generation run:

```json
{
  "trigger": "manual_refresh",
  "selectionStrategy": "tension_pair",
  "modes": ["literary fragment", "aphorism bundle", "essay seed"]
}
```

Return `202 Accepted` with the run/job ID when background processing is enabled.

### New `GET /api/jobs/:id`

Return status for upload processing, enrichment, and generation runs. This avoids overloading domain endpoints with polling logic.

## Background Processing Needs

### Minimum v1.2 Worker

For the current Next API structure, a simple database-backed worker is enough:

- `processing_jobs` table as queue.
- A worker script that claims queued jobs using status transitions.
- Idempotent job handlers by `kind`.
- Retry with capped attempts.
- Store `inputSnapshot` so model/extraction outputs remain explainable.

This can run as:

- a local script during development,
- a Vercel cron/serverless-compatible endpoint if deployed there,
- or a lightweight Node process if the app runs on a persistent host.

Do not add Redis/BullMQ unless deployment requires it. The product is still single-user v1 and already uses Postgres as the source of truth.

### Job Ordering

Recommended job dependencies:

```text
media_extraction
  -> metadata_enrichment
  -> tagging
  -> embedding
  -> relationship_inference
  -> generation_grid
  -> generation_quality_eval
```

For plain text fragments, skip `media_extraction`.

### Idempotency Rules

- One active enrichment job per entity and kind.
- Jobs should read current entity state before writing.
- Generation grid jobs should create a new `generation_run`, not overwrite previous runs.
- Failed enrichment must not delete the saved source fragment or initial memory node.
- Re-running enrichment should create a new `metadata_extractions` row and update canonical metadata only when confidence is equal or higher.

## Memory/Brain Integration

`src/svelte/MemoryGraph.svelte` should stay a custom element fed by JSON from `pages/memory.tsx`. The integration change is in the data contract, not the rendering ownership.

Add graph node fields:

- `tags`
- `metadataStatus`
- `generationReady`
- `qualitySignals`
- `processingStatus`
- `sourceFragment.inferredMetadata`

Add graph edge fields:

- `confidence`
- `source`
- `status`
- `evidence`

Visual recommendations:

- Processing nodes: muted or pulsing state.
- Enriched nodes: normal state with tag chips in preview.
- Needs-review nodes: warning state.
- Suggested relationships: dashed line.
- Accepted relationships: solid line.
- Relationship type labels should appear in the preview panel first, not as always-on SVG clutter.

Keep Memory/Brain read-only for v1.2. Editing tags and accepting/rejecting relationships can be deferred unless the roadmap explicitly prioritizes curation controls.

## Generated Content Integration

`pages/workshop.tsx` currently generates six bundles on boot via `generateGrid()`. Replace that behavior in the v1.2 plan with:

```text
Generated Content page mounts
  -> GET /api/generation-runs/latest
  -> render latest passed bundles
  -> if no run exists, show "Upload or generate first"
  -> Refresh generated grid button calls POST /api/generation-runs
  -> poll GET /api/jobs/:id or GET /api/generation-runs/:id
```

The grid should be automatic in the product sense, but not an uncontrolled side effect of viewing the page. Upload can enqueue generation automatically. The page should display generation state.

Generation should select thought objects by atlas structure:

- Recent high-quality nodes.
- Tag clusters with enough density.
- Tension pairs such as `supports` plus `rebuts`, or `extends` plus `inverts`.
- Evaluation feedback, especially quote leakage, source mimicry, generic profundity, and tension flattening risks.

## Schema Change Summary

### Add Tables

| Table | Purpose |
|---|---|
| `processing_jobs` | Durable queue for enrichment, tagging, relationship inference, and generation |
| `tags` | Normalized tag vocabulary |
| `thought_object_tags` | Tag assignments with confidence and evidence |
| `metadata_extractions` | Auditable extraction attempts and model outputs |
| `generation_runs` | Parent record for automatic generated grids |
| `generation_bundle_quality` | Automatic quality gates for generated outputs |

### Modify Tables

| Table | Changes |
|---|---|
| `source_fragments` | Add processing summary and metadata quality fields |
| `thought_objects` | Add metadata status, generation readiness, quality signals, embedding model metadata |
| `thought_object_relationships` | Add confidence, source, evidence, and suggestion lifecycle |
| `generation_contexts` | Add source, selection strategy, context quality, run linkage |
| `generation_bundles` | Add run linkage, status, quality summary, lineage summary, mode, formal constraint |
| `media_items` | Add extraction status, warnings, and derived thought object IDs |

## Build Order

### 1. Stabilize Data Model

Add migrations for:

- `processing_jobs`
- metadata status fields
- tag tables
- relationship confidence/source/status
- generation run tables

This should come first because every later task needs durable state.

### 2. Extract Processing Services

Move orchestration logic out of API handlers into reusable server-side functions:

- `createFragmentMemory(...)`
- `createMediaMemory(...)`
- `enqueueProcessingJobs(...)`
- `runMetadataEnrichmentJob(...)`
- `runTaggingJob(...)`
- `runRelationshipInferenceJob(...)`
- `runGenerationGridJob(...)`

`lib/atlas.ts` can keep deterministic helpers, but job orchestration should live in a new server-side module such as `lib/processing.ts` or `lib/atlas-processing.ts`.

### 3. Update Upload APIs

Modify `/api/fragments` and `/api/media-items` to:

- persist canonical rows,
- create initial thought objects,
- write job rows,
- return processing state.

Do this before UI changes so existing upload flows remain functional.

### 4. Implement Worker

Add a simple worker/runner:

- claim queued jobs,
- process by kind,
- update status,
- store extraction attempts,
- recover from failures.

Start with manual/dev invocation if needed. The architecture should not depend on production scheduling before the data flow is proven.

### 5. Enrich Thought Objects and Tags

Implement metadata extraction, normalized tags, quality signals, and generation readiness. Update `/api/thought-objects` to expose this enriched shape.

### 6. Infer Relationships

Add candidate relationship inference after tags and embeddings are available. Insert suggested relationships with confidence rather than silently treating them as user-approved truth.

### 7. Update Memory/Brain Contract

Update `pages/memory.tsx` and `MemoryGraph.svelte` to display:

- status,
- tags,
- quality,
- suggested vs accepted edges.

Keep this purely presentational.

### 8. Add Generation Runs

Implement `/api/generation-runs` and move grid generation out of `pages/workshop.tsx` page boot. Use `generation_runs` as the durable parent for generated grid output.

### 9. Add Automatic Quality Gates

Before displaying a generated bundle as passed:

- verify provenance coverage,
- check quote leakage/source mimicry risk,
- check generic profundity risk,
- check tension preservation,
- mark failed candidates as `needs_review` or `rejected`.

Manual `bundle_evaluations` should continue feeding `evaluationGuidance()` or its successor.

### 10. Wire Upload-to-Generation Automation

After the pipeline is reliable, make upload enqueue `generation_grid` when new material changes the memory enough to matter. Use debouncing or one queued grid job per processing batch so multiple uploads do not create redundant grids.

## Risk Areas

### Overwriting Provenance

Do not let enriched metadata overwrite original source fields. Model-derived title/author/source hints belong in extraction metadata unless the user explicitly promotes them.

### Side Effects on Read Pages

Generating bundles on page load is acceptable for a prototype, but v1.2 should remove it. Viewing Generated Content should read state; upload or refresh should trigger generation.

### Treating Suggested Edges as Truth

Automatic relationship inference should start with `suggested` edges and confidence. The graph can show them, but generation should weight accepted and high-confidence suggested edges differently.

### Metadata Without Evidence

Tags and worldview coordinates should include confidence/evidence when inferred automatically. Otherwise the graph looks authoritative while hiding weak classification.

### Too Much Infrastructure

Avoid adding a dedicated graph database or distributed queue for v1.2. Postgres tables, relational edges, and a database-backed worker fit the current single-user v1 scope.

## Roadmap Implications

Recommended v1.2 phase sequence:

1. **Processing State Foundation** - schema, job table, statuses, idempotency.
2. **Automatic Enrichment** - metadata extractions, normalized tags, quality signals.
3. **Graph Readiness** - relationship inference and Memory/Brain display contract.
4. **Generation Runs** - durable automatic grid generation and latest-run API.
5. **Quality Gates** - automatic bundle checks, evaluation feedback loop, visible generation quality states.

This order preserves the current working vertical loop while replacing fragile synchronous heuristics with a pipeline that can improve quality over time.

## Open Questions for Planning

- Should v1.2 include user review controls for accepting/rejecting tags and relationships, or should it remain fully automatic and view-only?
- What deployment target should own the worker: local script, serverless cron, or persistent Node process?
- Should media without extracted text produce only one placeholder thought object, or should extraction later split it into multiple memory nodes?
- What minimum quality threshold should block a generated bundle from appearing in the automatic grid?
- Should model-based metadata enrichment be part of v1.2 implementation, or should v1.2 first build the job architecture and keep heuristic enrichment behind the same interface?
