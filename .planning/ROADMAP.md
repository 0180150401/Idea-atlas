# Roadmap: Idea Atlas

**Created:** 2026-06-15
**Mode:** Brownfield milestone roadmap
**Current Milestone:** v1.2 Auto Metadata and Generation Quality
**v1.2 Requirements:** 26
**v1.2 Coverage:** 26 mapped, 0 unmapped

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (completed 2026-06-16)
- ✅ **v1.1 Literary Intelligence UX** — Phases 7-10 (completed 2026-06-16)
- 🚧 **v1.2 Auto Metadata and Generation Quality** — Phases 11-16 (complete 2026-06-16)

## Phase Overview

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation and Ingestion | Create the local app foundation and let the user save provenance-rich thought-objects | v1.0 foundation/ingestion | Complete |
| 2 | Structuring Pipeline | Turn raw thought-objects into reviewed structured records with embeddings | v1.0 structuring | Complete |
| 3 | Retrieval and Relations | Let the user find atlas regions and connect thought-objects | v1.0 retrieval/relations | Complete |
| 4 | Generation Bundles | Generate provenance-aware aphorism bundles from selected atlas context | v1.0 generation | Complete |
| 5 | Evaluation and Atlas Browser | Evaluate generated work and browse clusters, outliers, and border zones | v1.0 evaluation/atlas | Complete |
| 6 | Liminal Studio UX | Drop media/text, infer metadata, and iterate generations from media plus atlas context | Studio UX | Complete |
| 7 | Living Canon | Consolidate ingestion into a minimal-input canon-building section | v1.1 canon | Complete |
| 8 | Influence Atlas | Upgrade the graph into a literary influence network | v1.1 atlas | Complete |
| 9 | Generative Workshop | Create a generation/revision studio with constraints and provenance | v1.1 workshop | Complete |
| 10 | Literary Evaluation Loop | Make literary-quality evaluation feed future retrieval and generation | v1.1 evaluation | Complete |
| 11 | Processing State Foundation | Make upload and enrichment durable, visible, retryable, and generation-readiness aware | PROC-01, PROC-02, PROC-03, PROC-04 | Complete |
| 12 | AI Schemas and Embedding Migration | Add typed AI contracts, provider/version provenance, real semantic embeddings, and safe backfill | SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04 | Complete |
| 13 | Metadata and Tag Taxonomy | Extract evidence-backed literary metadata and normalize tags into stable families | META-01, META-02, META-03, META-04, META-05 | Complete |
| 14 | Relationship Inference and Memory Contract | Infer typed literary relationships with confidence/evidence and expose them in Memory/Brain | REL-01, REL-02, REL-03, REL-04 | Complete |
| 15 | Durable Generation Runs | Replace page-load generation with durable automatic runs and latest-run grid loading | GENRUN-01, GENRUN-02, GENRUN-03, GENRUN-04, GENRUN-05 | Complete |
| 16 | Quality Gates and Feedback Loop | Gate generated content by quote-risk, mimicry, false lineage, genericness, and feedback | QUAL-01, QUAL-02, QUAL-03, QUAL-04 | Complete |

## Phase Details

### Phase 11: Processing State Foundation

**Goal:** Make upload and enrichment durable, visible, retryable, and generation-readiness aware.
**Mode:** milestone
**Requirements:** PROC-01, PROC-02, PROC-03, PROC-04
**UI hint:** yes

**Success Criteria**:

1. Upload and paste still require no metadata fields from the user.
2. Source fragments, media items, and thought objects have processing state visible to APIs and upload UI.
3. Processing jobs are idempotent and retryable without duplicate memory records.
4. Memory items can be marked generation-ready, failed, partial, or blocked by extraction quality.

### Phase 12: AI Schemas and Embedding Migration

**Goal:** Add typed AI contracts, provider/version provenance, real semantic embeddings, and safe backfill.
**Mode:** milestone
**Requirements:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04
**UI hint:** no

**Success Criteria**:

1. AI-derived output is validated before storage.
2. Extraction records store model, provider, schema version, method, and warnings.
3. New semantic embeddings are stored without breaking existing memory nodes.
4. Existing records can be backfilled safely and repeatedly.

### Phase 13: Metadata and Tag Taxonomy

**Goal:** Extract evidence-backed literary metadata and normalize tags into stable families.
**Mode:** milestone
**Requirements:** META-01, META-02, META-03, META-04, META-05
**UI hint:** yes

**Success Criteria**:

1. Automatic metadata includes evidence and confidence for key literary fields.
2. Factual, textual, and interpretive metadata are stored separately.
3. Tags are normalized into domain, motif, form, affect, worldview, source, and risk families.
4. Tag assignments include confidence, source, evidence, and lifecycle state.
5. Generation readiness is computed from metadata quality, confidence, quote risk, and source sufficiency.

### Phase 14: Relationship Inference and Memory Contract

**Goal:** Infer typed literary relationships with confidence/evidence and expose them in Memory/Brain.
**Mode:** milestone
**Requirements:** REL-01, REL-02, REL-03, REL-04
**UI hint:** yes

**Success Criteria**:

1. The system suggests relationships from embeddings, tags, metadata, and textual evidence.
2. Relationship types include the v1.2 literary vocabulary.
3. Suggested edges store confidence, evidence, source, and lifecycle state.
4. The Svelte Memory/Brain graph can preview relationship evidence and distinguish suggested, confirmed, rejected, and derived edges.

### Phase 15: Durable Generation Runs

**Goal:** Replace page-load generation with durable automatic runs and latest-run grid loading.
**Mode:** milestone
**Requirements:** GENRUN-01, GENRUN-02, GENRUN-03, GENRUN-04, GENRUN-05
**UI hint:** yes

**Success Criteria**:

1. Generated Content no longer creates database rows simply by loading the page.
2. Each generation run snapshots context, route strategy, source lineage, thresholds, and output plan.
3. Generated Content loads the latest completed run into its grid.
4. The system can refresh generation from generation-ready memory without prompts or configuration.
5. Each text box exposes source route, influence weights, central tension, transformation note, and quality warnings.

### Phase 16: Quality Gates and Feedback Loop

**Goal:** Gate generated content by quote-risk, mimicry, false lineage, genericness, and feedback.
**Mode:** milestone
**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04
**UI hint:** yes

**Success Criteria**:

1. Generated content receives automatic quality checks before being marked passed.
2. High-risk output is blocked or clearly flagged.
3. Quality flags, rejection, and accepted outputs influence future context selection and generation guidance.
4. Generated drafts keep lineage and acceptance state separate from source memory.

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| PROC-01 | Phase 11 |
| PROC-02 | Phase 11 |
| PROC-03 | Phase 11 |
| PROC-04 | Phase 11 |
| SCHEMA-01 | Phase 12 |
| SCHEMA-02 | Phase 12 |
| SCHEMA-03 | Phase 12 |
| SCHEMA-04 | Phase 12 |
| META-01 | Phase 13 |
| META-02 | Phase 13 |
| META-03 | Phase 13 |
| META-04 | Phase 13 |
| META-05 | Phase 13 |
| REL-01 | Phase 14 |
| REL-02 | Phase 14 |
| REL-03 | Phase 14 |
| REL-04 | Phase 14 |
| GENRUN-01 | Phase 15 |
| GENRUN-02 | Phase 15 |
| GENRUN-03 | Phase 15 |
| GENRUN-04 | Phase 15 |
| GENRUN-05 | Phase 15 |
| QUAL-01 | Phase 16 |
| QUAL-02 | Phase 16 |
| QUAL-03 | Phase 16 |
| QUAL-04 | Phase 16 |

---
*Roadmap updated: 2026-06-16 after v1.2 auto metadata and generation quality planning*
