# Technology Stack: v1.2 Automatic Metadata and Generation Quality

**Project:** Idea Atlas  
**Milestone:** v1.2 Improve automatic metadata, tagging, relationship inference, and content generation quality  
**Researched:** 2026-06-16  
**Overall confidence:** HIGH for AI SDK / Zod / pgvector recommendations; MEDIUM for document extraction library choices because package behavior should be validated against the user's real corpus.

## Executive Recommendation

Keep the existing Next.js / React / Drizzle / Postgres architecture. The quality problem is not caused by the app framework; it is caused by the current local heuristics in `lib/atlas.ts`: marker-based metadata, 8-dimensional hash embeddings, and string-template generation.

For v1.2, add a thin AI service layer instead of a broad orchestration framework:

1. **Vercel AI SDK + Zod** for schema-constrained metadata extraction, relationship inference, critique, and generation bundle output.
2. **OpenAI `text-embedding-3-small` via AI SDK embeddings** for real semantic vectors stored in Postgres `pgvector`.
3. **Optional Anthropic provider via AI SDK** for the highest-quality literary generation pass, while keeping extraction/embeddings provider-agnostic.
4. **Simple document extraction libraries** for PDFs, DOCX, and OCR only where needed; do not introduce a full ingestion platform yet.
5. **Background job table or queue-lite worker** for automatic processing after upload, but defer Redis/BullMQ until uploads become slow or concurrent.

This gives the product the desired UX: users upload material, the system automatically enriches it, graph relationships appear, and generated content improves without exposing prompt/configuration UI.

## Recommended Stack Additions

### AI and Schema Layer

| Addition | Purpose | Recommendation | Why |
|----------|---------|----------------|-----|
| `ai` | Unified model calls, structured output, embeddings, reranking | Add now | Official docs support typed object generation, embeddings, provider registry, and retries/timeouts. Keeps model calls centralized instead of scattering provider SDK code. |
| `zod` | Runtime validation and TypeScript inference for model outputs | Add now | Use shared schemas for metadata, inferred tags, relationship candidates, generation bundles, and evaluation claims. Prevents untrusted LLM JSON from going straight into `jsonb`. |
| `@ai-sdk/openai` | Embeddings and default structured extraction provider | Add now | OpenAI embeddings docs list `text-embedding-3-small` as 1536 dimensions and suitable for search, clustering, recommendations, classification, and anomaly detection. |
| `@ai-sdk/anthropic` | Optional high-quality literary generation provider | Add when generation quality matters more than one-provider simplicity | AI SDK supports provider management and aliases, so generation can use a different provider without changing API code. |
| `@ai-sdk/cohere` | Optional reranking provider | Defer unless retrieval quality is weak after embeddings | AI SDK supports reranking with Cohere `rerank-v3.5`, but this is a second-order improvement after real embeddings. |

Recommended install:

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic zod
```

Optional later:

```bash
npm install @ai-sdk/cohere
```

### Embeddings and Search

| Current | Recommended | Migration Impact |
|---------|-------------|------------------|
| `vector(8)` hash buckets in `thought_objects.embedding` | `vector(1536)` embeddings from `text-embedding-3-small` | Requires a migration and re-embedding existing thought objects. |
| In-memory/local cosine similarity helpers | Postgres vector similarity using pgvector operators through Drizzle | Requires query changes but fits existing Postgres/Drizzle stack. |
| No vector index | HNSW index with `vector_cosine_ops` | Requires SQL migration. Good default for approximate nearest neighbor search. |

Use OpenAI `text-embedding-3-small` first. It is much better than the current hash vector, cost-conscious, and maps cleanly to Drizzle's existing `vector` column support. Do not jump to a standalone vector database in v1.2; Postgres plus pgvector is enough for a single-user literary atlas.

Recommended migration shape:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE thought_objects
  ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX IF NOT EXISTS thought_objects_embedding_hnsw
  ON thought_objects
  USING hnsw (embedding vector_cosine_ops);
```

If a destructive `ALTER COLUMN` is awkward with existing data, add a new nullable `embedding_v2 vector(1536)`, backfill, switch reads, then drop/rename later. That is safer for an in-progress app with existing local data.

### Document and Media Extraction

| Media Type | Recommendation | Confidence | Notes |
|------------|----------------|------------|-------|
| Plain text / Markdown | Native text handling | HIGH | Already supported; route through AI metadata extraction instead of keyword heuristics. |
| PDF with selectable text | `pdf-parse` or `pdfjs-dist` | MEDIUM | Use only for extracting text and basic metadata. Validate on the user's actual PDFs before committing deeply. |
| DOCX | `mammoth` | MEDIUM | Good fit for raw text / simple HTML extraction from Word documents. Avoid preserving complex styling; the atlas needs semantic text, not layout fidelity. |
| Images needing OCR | `tesseract.js` | MEDIUM | Useful for occasional image text extraction. Official package notes it does not support PDF files directly and does not improve OCR models. Defer unless image OCR is part of v1.2. |
| Audio/video transcription | Provider transcription API through AI SDK or direct provider SDK | LOW for v1.2 | Defer unless the milestone explicitly includes audio/video semantic extraction. Current app should improve text/document quality first. |

Recommended install if document extraction enters v1.2:

```bash
npm install pdf-parse mammoth
```

Optional OCR:

```bash
npm install tesseract.js
```

Avoid native-heavy all-format extraction stacks for now unless the user's corpus proves that many formats are central. Libraries such as Rust-backed multi-format extractors may be attractive, but they raise deployment/build risk relative to the current simple Next.js app.

## Integration Points

### `lib/atlas.ts`

Replace heuristic functions with orchestrating wrappers, not direct provider calls everywhere:

| Existing Function | v1.2 Direction |
|-------------------|----------------|
| `extractMetadata(rawText)` | Keep as deterministic fallback, but add `extractStructuredMetadata(rawText, sourceContext)` using AI SDK + Zod. |
| `inferCanonMetadata(rawText, fragmentType)` | Route through schema-constrained extraction for title, author/work hints, genre/form, motifs, domains, rhetoric, affective register, worldview coordinates, and quote-leak risk. |
| `embedText(rawText)` | Replace with `embedThoughtObject(rawText)` using AI SDK `embed` and OpenAI `text-embedding-3-small`. |
| `draftBundle(thoughts, options)` | Replace template generation with model-backed `generateObject` returning the existing bundle shape plus central tension, lineage, critique, reversal, and quote-leak warnings. |
| Relationship helpers | Add `inferRelationshipCandidates(source, candidates)` that first narrows candidates by embedding similarity, then asks the model for typed edges with confidence and evidence snippets. |

Keep raw source wording separate from extracted metadata. AI output should only populate metadata/relationship/generation tables, never overwrite `rawText`.

### `pages/api/fragments/index.ts`

Current POST immediately creates a `source_fragments` row and a ready `thought_objects` row using local heuristics. For v1.2:

1. Insert the raw fragment immediately.
2. Create thought object with `status = 'raw'` or `status = 'processing'`.
3. Run metadata extraction, embedding, relationship inference, and status promotion as a server-side processing step.
4. Return the fragment quickly while the UI shows automatic enrichment progress.

For a local/single-user milestone, a Postgres-backed `processing_jobs` table is enough. Defer BullMQ/Redis unless concurrent uploads or long media processing make API requests unreliable.

### `pages/api/media-items/index.ts`

Current media upload stores `dataUrl` and metadata in Postgres. For v1.2:

1. Extract text first when possible.
2. Store extraction provenance in `media_items.metadata`: extractor name, extraction mode, confidence, errors, and source page/segment if available.
3. Feed extracted text into the same metadata/embedding path as fragments.
4. Do not send large `dataUrl` blobs to LLM providers by default. Send text excerpts and compact metadata unless visual analysis is explicitly needed.

If files get larger than the current 10 MB body limit, move binary storage out of Postgres into filesystem/object storage. That is not required just to improve metadata/generation quality.

### `pages/api/generate.ts`

Current generation uses fallback recent thoughts and deterministic templates. For v1.2:

1. Retrieve candidates by selected atlas region or semantic search.
2. Add a diversity step: include nearest neighbors, contradiction candidates, and distant analogues.
3. Generate a typed bundle with a Zod schema matching `generation_bundles`.
4. Store provider/model/version, prompt template version, source IDs, influence weights, and quote-leakage warnings in provenance.
5. Run an automatic evaluator pass before surfacing content in Generated Content.

Generated Content should appear automatically, but the system should still distinguish "draft/generated" from "accepted/promoted into memory".

### `db/schema.ts`

Minimal schema additions likely needed:

| Area | Change |
|------|--------|
| Embeddings | Move from `vector(8)` to `vector(1536)` or add `embeddingV2 vector(1536)`. |
| Processing | Add `processing_jobs` or equivalent status fields for automatic background enrichment. |
| Metadata provenance | Add `extraction_runs` or embed provenance inside JSONB: model, schema version, confidence, createdAt, source fields used. |
| Relationships | Extend relationship `type` enum vocabulary to include v1.1 literary edges: echoes, rebuts, extends, inverts, parodies, descends-from, radicalizes, secularizes, shares-image-system, shares-rhetorical-form. Add `confidence`, `evidence`, and `inferredBy`. |
| Generation provenance | Add model/provider/schema version and automatic evaluator results, either in existing `provenance` JSONB or a separate generation metadata field. |

Do not migrate to a graph database in v1.2. The roadmap explicitly favors relational edges before dedicated graph infrastructure, and the current schema already has the right foundation.

## What To Avoid

| Avoid | Why |
|-------|-----|
| LangChain/LlamaIndex as the first v1.2 abstraction | Too heavy for the current app. The app needs schema-constrained extraction, embeddings, and a few typed pipelines, not a general agent framework. |
| Dedicated vector database | Postgres + pgvector already fits the data model and avoids extra infrastructure. |
| Neo4j / graph database migration | Relationship volume and query complexity do not justify it yet. Typed relational edges preserve simplicity. |
| Prompt/configuration-heavy UI | Conflicts with the current UX direction. Put model choices and extraction schemas behind the scenes. |
| Letting LLMs mutate source text | Violates provenance invariants and increases quote-leakage risk. |
| Storing unvalidated LLM JSON directly | Creates inconsistent metadata and future migration pain. Validate with Zod and schema versions. |
| Generating single isolated aphorisms | The project invariant is bundle generation with lineage, reversal, critique, and provenance. |
| Automatic high-confidence edges without evidence | Relationship inference must store confidence and evidence snippets; otherwise the graph becomes decorative fiction. |

## Migration Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Embedding dimension migration from 8 to 1536 breaks existing vector reads | High | Prefer `embedding_v2` backfill and read-switch migration over destructive alteration. |
| LLM metadata extraction becomes slow or expensive on upload | Medium | Insert raw records first, process asynchronously, batch embeddings with `embedMany`, cache by content hash. |
| Model outputs vary and destabilize filters/tags | Medium | Use Zod schemas, enums where possible, controlled vocabularies, confidence scores, and schema versions. |
| Relationship inference creates false literary lineage | High | Require evidence snippets, confidence, relationship rationale, and automatic evaluator flags for false lineage. |
| Quote leakage or source mimicry in generated content | High | Keep provenance visible, run quote-leak checks, include hostile reading/reversal, and store transformation claims separately from source wording. |
| Provider lock-in | Medium | Use AI SDK provider registry and model aliases such as `metadata-fast`, `embedding`, and `literary-generation`. |
| Native/OCR extraction complicates local dev/deploy | Medium | Start with text/PDF/DOCX; make OCR optional and feature-gated. |

## Suggested Implementation Order

1. **Schemas and provider registry**
   - Add `lib/ai/schemas.ts` for metadata, relationship, generation, and evaluation schemas.
   - Add `lib/ai/models.ts` for provider/model aliases.

2. **Embedding migration**
   - Add 1536-dimensional embedding column or migrate existing one.
   - Backfill existing thought objects.
   - Use pgvector cosine search and HNSW index.

3. **Metadata extraction**
   - Replace `inferCanonMetadata` internals with AI SDK structured extraction.
   - Preserve heuristic extraction as fallback and for test determinism.

4. **Relationship inference**
   - Use embeddings to select candidate neighbors.
   - Use schema-constrained LLM classification to assign relationship types, confidence, and evidence.

5. **Generation upgrade**
   - Replace `draftBundle` templates with typed generation output.
   - Include lineage, central tension, reversal, hostile reading, quote-leak warning, and transformation note.

6. **Automatic processing UX**
   - Add processing status so Upload Material can stay simple while Memory/Brain and Generated Content update automatically.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| AI SDK + Zod | HIGH | Official AI SDK docs support structured data generation, embeddings, provider management, retries, and typed schemas; Zod is stable and TypeScript-first. |
| OpenAI embeddings | HIGH | Official OpenAI docs list `text-embedding-3-small` as 1536-dimensional and suitable for search, clustering, recommendations, and classification. |
| pgvector with Drizzle | HIGH | Drizzle docs show `vector(1536)`, pgvector extension migration, HNSW index, and cosine similarity query patterns. |
| Anthropic for literary generation | MEDIUM | Strong fit for quality generation, but exact model choice should remain configurable through AI SDK aliases. |
| PDF/DOCX/OCR extraction | MEDIUM | Library selection should be validated against the user's actual corpus; OCR and scanned PDFs are common sources of hidden complexity. |
| Reranking | MEDIUM | Useful if retrieval is noisy, but likely not needed before real embeddings are in place. |

## Sources

- Vercel AI SDK structured data: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Vercel AI SDK `generateObject`: https://ai-sdk.dev/v5/docs/reference/ai-sdk-core/generate-object
- Vercel AI SDK embeddings: https://ai-sdk.dev/docs/ai-sdk-core/embeddings
- Vercel AI SDK provider management: https://ai-sdk.dev/docs/ai-sdk-core/provider-management
- Vercel AI SDK reranking: https://ai-sdk.dev/docs/ai-sdk-core/reranking
- Drizzle pgvector guide: https://orm.drizzle.team/docs/guides/vector-similarity-search
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings
- Zod documentation: https://zod.dev/
- Tesseract.js package docs: https://www.npmjs.com/package/tesseract.js
- Mammoth package docs: https://www.npmjs.com/package/mammoth
