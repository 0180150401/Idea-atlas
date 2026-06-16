# Research Summary: v1.2 Auto Metadata and Generation Quality

**Project:** Idea Atlas  
**Domain:** Personal literary intelligence, influence atlas, and provenance-aware generation system  
**Milestone:** v1.2 - Improve automatic metadata, tagging, relationship inference, and content generation quality  
**Researched:** 2026-06-16  
**Confidence:** HIGH for stack and architecture direction; MEDIUM-HIGH for product behavior; MEDIUM for document extraction and deployment-specific worker details.

## Executive Summary

v1.2 should make Idea Atlas feel upload-only without making it opaque. A serious reader-writer should be able to drop in text, passages, documents, or media and see a memory object become enriched automatically with source hints, literary form, motifs, affective register, rhetorical pattern, worldview tensions, quote-risk status, relationship suggestions, and generation readiness. The product should not add required metadata forms, but it must expose confidence, evidence, and lightweight correction paths so automatic interpretation remains accountable.

The recommended technical approach is to keep the existing Next.js, React, Drizzle, Postgres, and pgvector foundation. The quality problem is not the app framework; it is the current reliance on synchronous heuristics, 8-dimensional hash embeddings, and template generation. v1.2 should add a thin AI service layer using Vercel AI SDK, Zod schemas, real embeddings, normalized tags, auditable extraction runs, and a Postgres-backed processing pipeline.

The main risk is quality contamination: weak inferred tags can become graph structure, retrieval context, provenance claims, and generated writing. Mitigate this by treating model output as candidate metadata until it has confidence, evidence, canonical mapping, and quality gates. Generated content should continue to be bundles with lineage, reversal, critique, and quote-leak warnings, not isolated one-liners or ungrounded "profound" text.

## Key Findings

### Recommended Stack

Keep the current product stack and add only the pieces needed to replace fragile local heuristics with typed, auditable enrichment. Do not introduce LangChain, LlamaIndex, Neo4j, a dedicated vector database, or Redis/BullMQ in v1.2 unless implementation evidence proves the current Postgres-centered app cannot handle the workload.

**Core technologies:**
- `ai` - centralizes model calls, structured output, embeddings, provider aliases, retries, and timeouts.
- `zod` - validates all LLM outputs before they enter `jsonb`, tag tables, relationships, or generation provenance.
- `@ai-sdk/openai` - provides `text-embedding-3-small` embeddings and a default structured extraction provider.
- `@ai-sdk/anthropic` - optional provider for higher-quality literary generation while keeping extraction provider-agnostic.
- Postgres `pgvector` - remains the right vector store for a single-user v1; migrate from `vector(8)` to `vector(1536)` or add an `embedding_v2` column.
- `pdf-parse` or `pdfjs-dist`, plus `mammoth` - optional document text extraction for PDFs and DOCX after validation against the user's real corpus.
- `tesseract.js` - defer unless image OCR is explicitly part of v1.2.

**Critical stack additions:**
- Add `lib/ai/schemas.ts` for metadata, tag, relationship, generation, and evaluation schemas.
- Add `lib/ai/models.ts` for provider/model aliases such as `metadata-fast`, `embedding`, and `literary-generation`.
- Add a Postgres-backed `processing_jobs` table before adding external queue infrastructure.
- Store model/provider/schema versions and extraction provenance for every automatic enrichment run.

### Expected Features

The table-stakes behavior is not "more AI controls"; it is an automatic, inspectable memory pipeline. Upload should remain minimal, while Memory/Brain and Generated Content gain enough state to show what the system inferred, why it believes it, and whether it is safe to use for graphing or generation.

**Must have (table stakes):**
- Zero-form ingestion - upload or paste material without mandatory title, author, tags, or prompt fields.
- Processing state and retry - show queued, extracting text, inferring metadata, embedding, linking, generation-ready, and failed states.
- Source text preservation - never overwrite original wording with summaries or model-derived metadata.
- Evidence-backed metadata - important inferred fields carry confidence, method, and source snippets.
- Stable personal tag taxonomy - normalize tags into controlled families instead of allowing free-text drift.
- Tag confidence tiers - distinguish confirmed, suggested, weak, rejected, and user-corrected signals.
- Literary-specific metadata - infer genre/form, motif, rhetoric, affect, claim type, worldview tension, source hints, and quote-leak sensitivity.
- Relationship suggestions - propose typed edges with confidence and evidence instead of anonymous similarity links.
- Canon readiness gate - only reliable, sufficiently grounded items should influence automatic generation.
- Provenance-visible generation - every generated bundle should show source route, influence weights, central tension, transformation note, and quality warnings.

**Should have (differentiators):**
- Tension extraction - make worldview pressure such as agency/surrender or order/emergence a first-class memory signal.
- Rhetorical fingerprinting - tag antithesis, paradox, reversal, compression, hostile reading, and image-system patterns.
- Image-system clustering - reveal recurring images such as threshold, ruin, machine, body, pilgrimage, light/shadow.
- Contradiction-first graph routes - generate from friction, not only nearest-neighbor similarity.
- Relationship type voting by evidence - allow multiple candidate interpretations when evidence supports ambiguity.
- Canon influence profile - summarize dominant motifs, unresolved tensions, overused forms, and missing counterweights.
- Automatic generation agenda - generate synthesis, reversal, hostile reading, essay seed, and image-based fragments based on graph routes.
- Promotion loop - let accepted generated or revised material return to memory with full generated-artifact lineage.
- Negative influence control - let resisted, unresolved, loved, formative, or excluded material affect generation.

**Defer (v2+ or later v1 work):**
- Full multimodal understanding for image, audio, and video.
- Readwise, Zotero, Kindle, or broad connector ecosystems.
- Advanced graph layout algorithms before typed, explained relationships exist.
- Many new generated formats before context selection, provenance, and critique are reliable.
- Silent taxonomy rewrites; start with suggested merges and aliases.
- Public publishing, collaboration, or export loops.

### Architecture Approach

The architectural shift is from "synchronous heuristics at write time" to "synchronous durable ingest plus asynchronous enrichment." Upload APIs should save source material and create an initial memory node immediately, then queue enrichment work for metadata extraction, tag normalization, embedding, relationship inference, generation runs, and quality evaluation. Memory/Brain should read enriched graph state. Generated Content should read the latest durable generation run rather than creating bundles as a side effect of page load.

**Major components:**
1. `processing_jobs` - durable queue for extraction, metadata enrichment, tagging, embedding, relationship inference, generation grid creation, and quality checks.
2. `metadata_extractions` - auditable extraction attempts with raw output, normalized output, confidence, warnings, extractor/model identity, and schema version.
3. `tags` and `thought_object_tags` - normalized vocabulary plus confidence, source, and evidence per tag assignment.
4. `thought_object_relationships` - extend edges with confidence, source, evidence, and lifecycle state such as suggested, accepted, and rejected.
5. `generation_runs` - parent record for automatic generated grids, trigger, status, context snapshot, mode plan, thresholds, and produced bundle IDs.
6. `generation_bundle_quality` - automatic quality checks for novelty, quote leakage, source mimicry, tension preservation, provenance coverage, and generic profundity risk.
7. `lib/atlas.ts` plus new server modules - keep deterministic helpers, but move AI orchestration and job handling into focused server-side modules such as `lib/atlas-processing.ts`.
8. Upload APIs - keep durable ingest synchronous, return created rows plus processing state and job IDs.
9. Memory/Brain contract - expose tags, metadata status, generation readiness, quality signals, processing status, and richer edge evidence.
10. Generated Content APIs - add `/api/generation-runs` and `/api/generation-runs/latest`; keep `/api/generate` for immediate/manual single-bundle generation.

### Critical Pitfalls

1. **Treating inferred tags as ground truth** - store every inferred field with confidence, method, evidence, and canonical mapping; keep weak signals out of graph and generation prompts.
2. **Free-text tag drift** - create canonical tag IDs, synonyms, definitions, examples, and merge/deprecation paths before tags become graph-visible.
3. **Inferring literary relationships from weak similarity** - separate similarity from interpretive claims; require relation-specific evidence and conservative labels.
4. **Letting bad metadata enter generation automatically** - add generation readiness, context sufficiency checks, source diversity, and quality gates before automatic output.
5. **Confusing provenance display with grounding** - bundle-level source lists are not enough; store what each section transformed from source material.
6. **Quote leakage and source mimicry** - compare generated output against source snippets and prior outputs with exact overlap, distinctive phrase, and semantic mimicry checks.
7. **Generic profundity from over-abstract metadata** - require concrete source images, sentence shape, contradiction, affect, and tension preservation in every generation context.
8. **Canon contamination from generated outputs** - preserve artifact type and full lineage; exclude unaccepted generated drafts from default retrieval and graph inference.

## Implications for Roadmap

Based on research, v1.2 should be planned as a pipeline hardening milestone. The order matters because generation quality depends on source preservation, metadata confidence, tag stability, embeddings, relationship evidence, and context assembly.

### Phase 1: Processing State Foundation

**Rationale:** Every later improvement needs durable status, retry, and provenance before expensive model calls or generation workflows are added.  
**Delivers:** `processing_jobs`, processing statuses on source fragments/thought objects/media items, idempotent job rules, and basic job status API.  
**Addresses:** Processing state and retry, source preservation, automatic enrichment progress.  
**Avoids:** Silent failure, side effects in upload requests, and read pages that trigger writes.

### Phase 2: AI Schemas and Embedding Migration

**Rationale:** Model calls must be typed and embeddings must become semantically meaningful before tags or relationships drive graph and generation behavior.  
**Delivers:** AI SDK provider registry, Zod schemas, model aliases, `text-embedding-3-small`, `embedding_v2 vector(1536)` or equivalent migration, HNSW index, and backfill path.  
**Uses:** `ai`, `zod`, `@ai-sdk/openai`, Postgres `pgvector`.  
**Avoids:** Unvalidated LLM JSON, provider lock-in, and toy embeddings masquerading as literary semantics.

### Phase 3: Automatic Metadata and Tag Taxonomy

**Rationale:** The product promise starts here: upload-only material becomes an inspectable memory object without required forms.  
**Delivers:** `metadata_extractions`, normalized tag tables, tag confidence/evidence, factual/textual/interpretive metadata separation, generation readiness signals, and fallback heuristics.  
**Addresses:** Evidence-backed metadata, stable personal tag taxonomy, tag confidence tiers, literary-specific metadata.  
**Avoids:** Inferred tags as ground truth, free-text tag drift, file-name-only metadata pollution, and no-form UX turning into no-agency UX.

### Phase 4: Relationship Inference and Memory/Brain Contract

**Rationale:** Relationship inference should wait until metadata, tags, and embeddings are trustworthy enough to produce evidence-backed candidate edges.  
**Delivers:** Candidate selection by embeddings/shared tags/recent context, typed suggested relationships with confidence and evidence, richer `/api/relationships` filters, and Memory/Brain visualization of suggested versus accepted edges.  
**Addresses:** Relationship suggestions, relationship explanations, contradiction-first routes, image-system and rhetorical-form connections.  
**Avoids:** Dense graph spaghetti, false lineage, and embedding similarity being treated as influence.

### Phase 5: Durable Generation Runs

**Rationale:** Generated Content should be automatic in the product loop but not an uncontrolled side effect of opening a page.  
**Delivers:** `generation_runs`, `/api/generation-runs`, `/api/generation-runs/latest`, latest passed grid loading, refresh/regenerate action, context snapshots, selection strategies, and source route metadata.  
**Addresses:** Automatic generated-content refresh, automatic generation agenda, provenance-visible generation, tension-bearing output bundles.  
**Avoids:** Recency-only fallback, accidental hierarchy from arbitrary thought ordering, and generation from low-confidence or homogeneous context.

### Phase 6: Quality Gates and Feedback Loop

**Rationale:** Metadata, relationships, and generation should improve from evaluation, not merely display scores after failure.  
**Delivers:** `generation_bundle_quality`, quote leakage checks, source mimicry checks, generic profundity checks, tension preservation checks, provenance coverage, and feedback from rejection/promotion into future context selection.  
**Addresses:** Quality flags, authorial agency, promotion loop, negative influence control, overfamiliarity detection.  
**Avoids:** Provenance theater, source leakage, false lineage, canon contamination, and post-hoc evaluation that does not control future generation.

### Phase Ordering Rationale

- Durable processing comes first because automatic metadata and generation will become slow, retryable, and failure-prone once real extraction and model calls are introduced.
- Schemas and embeddings precede metadata, relationship, and generation changes because downstream surfaces need validated data and real semantic retrieval.
- Metadata and tag normalization precede relationship inference because literary edges require stable labels, evidence, and confidence.
- Relationship inference precedes durable generation because generation should select from meaningful graph routes, not raw recency.
- Quality gates come last in build order but should influence schema design from the beginning so evaluation can feed back into metadata confidence, context ranking, and generation constraints.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2: AI Schemas and Embedding Migration** - validate AI SDK v5 APIs, provider setup, embedding dimensions, Drizzle migration strategy, HNSW index syntax, and backfill safety.
- **Phase 3: Automatic Metadata and Tag Taxonomy** - define canonical tag families, schemas, confidence thresholds, and evidence representation against real corpus examples.
- **Phase 4: Relationship Inference and Memory/Brain Contract** - define relation registry, evidence requirements, directionality, and thresholds for suggested versus accepted edges.
- **Phase 6: Quality Gates and Feedback Loop** - research practical quote-leakage, source mimicry, groundedness, and generic-profundity checks.

Phases with standard patterns:
- **Phase 1: Processing State Foundation** - database-backed job tables, idempotent handlers, and status APIs are well understood.
- **Phase 5: Durable Generation Runs** - run records, latest-run APIs, and refresh/polling flows are standard once generation context schemas are defined.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | AI SDK, Zod, OpenAI embeddings, and Drizzle/pgvector recommendations are backed by official docs and match the existing architecture. Document extraction choices are MEDIUM until tested on the user's corpus. |
| Features | MEDIUM-HIGH | Strong alignment with project invariants and current product surfaces; exact correction UX and auto-refresh behavior need product decisions. |
| Architecture | HIGH for current-app direction; MEDIUM for worker deployment | The data-flow shift is well supported by current code and requirements. The specific worker runtime depends on deployment target. |
| Pitfalls | HIGH for project-specific risks; MEDIUM for ecosystem patterns | Risks are strongly tied to existing code and project invariants; external governance/evaluation patterns are useful but need local adaptation. |

**Overall confidence:** HIGH that v1.2 should be a typed, asynchronous enrichment and generation-quality milestone; MEDIUM on the exact scope of OCR/media extraction and user correction controls.

### Gaps to Address

- **User correction scope:** Decide whether v1.2 includes accepting/rejecting tags and relationships, or only displays confidence/evidence and defers editing controls.
- **Worker deployment:** Choose local script, serverless cron/endpoint, or persistent Node process before planning job execution details.
- **Document extraction corpus:** Validate PDF/DOCX libraries against the user's real source files before committing to extraction implementation depth.
- **Quote-leakage detector:** Define minimum viable checks: exact n-gram overlap, fuzzy phrase overlap, semantic paraphrase risk, model-assisted risk scoring, or a staged combination.
- **Generation refresh control:** Decide whether qualifying uploads auto-refresh the generated grid immediately or show "memory changed; refresh generated set" to preserve user control.
- **Relationship vocabulary:** Reconcile current relationship types with richer literary edges such as `echoes`, `parodies`, `radicalizes`, `secularizes`, `shares-image-system`, and `shares-rhetorical-form`.
- **Quality thresholds:** Define what blocks a generated bundle from appearing as passed: quote risk, provenance coverage, generic profundity, tension preservation, or source mimicry.

## Sources

### Primary (HIGH confidence)

- `.planning/PROJECT.md` - project identity, active requirements, constraints, and v1 direction.
- `.planning/research/v1.2-auto-metadata-generation/STACK.md` - stack additions, AI SDK/Zod/embedding recommendations, migration risks.
- `.planning/research/v1.2-auto-metadata-generation/FEATURES.md` - table-stakes behavior, differentiators, anti-features, metadata/tagging model.
- `.planning/research/v1.2-auto-metadata-generation/ARCHITECTURE.md` - current architecture, proposed components, data flows, API changes, build order.
- `.planning/research/v1.2-auto-metadata-generation/PITFALLS.md` - critical pitfalls, mitigation strategies, quality gates.

### Secondary (MEDIUM-HIGH confidence)

- Vercel AI SDK docs - structured data, `generateObject`, embeddings, provider management, reranking.
- OpenAI embeddings docs - `text-embedding-3-small` dimensions and embedding use cases.
- Drizzle pgvector guide - vector columns, extension migration, HNSW index, cosine similarity patterns.
- Zod documentation - runtime validation and TypeScript schema inference.
- Readwise Ghostreader docs - auto-tagging is useful but subjective and benefits from explicit taxonomy context.
- Obsidian and Heptabase public docs - PKM graph, tag, property, backlink, and source/citation expectations.

### Tertiary (MEDIUM confidence)

- PDF/DOCX/OCR package docs for `pdf-parse`, `pdfjs-dist`, `mammoth`, and `tesseract.js` - viable candidates, but real corpus validation is required.
- RAG groundedness and evaluation articles - useful framing for provenance and quality gates, but implementation must be tailored to literary generation.
- LLM leakage and plagiarism research - relevant to quote leakage and source mimicry, but minimum viable product checks need local calibration.

---
*Research completed: 2026-06-16*  
*Ready for roadmap: yes*
