# Phase 1: Foundation and Ingestion - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Bootstrap the local application with a provenance-preserving Postgres schema, and deliver a working UI for ingesting raw source fragments and saving atomic thought-objects. The phase ends when a user can paste raw material with source metadata, mark excerpts as thought-objects, define worldview axes, and see data persist across restarts.

Excluded from this phase: structured metadata extraction (Phase 2), embeddings (Phase 2), semantic search (Phase 3), generation (Phase 4), evaluation (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Framework and Tech Stack

- **D-01:** Use **Next.js Pages Router with TypeScript** as the full-stack framework. API routes at `/api/*` map directly to CRUD endpoints. Avoids App Router ceremony while providing SSR for initial data loading and a large ecosystem.
- **D-02:** Use **Drizzle ORM** for schema management and migrations. Type-safe, lightweight, works well with Postgres and Next.js. Run `npm run db:migrate` and `npm run db:seed` for setup.
- **D-03:** Use **Docker Compose with `pgvector/pgvector:pg16` image** from day 1. Starting with SQLite would require a schema + data migration in Phase 2 for pgvector support. `DATABASE_URL` configured via `.env.local`.

### Data Model

- **D-04:** Use **two separate tables** — `source_fragments` and `thought_objects` — enforcing the provenance hard invariant at the schema level.
  - `source_fragments(id, raw_text, source_type, title, author, citation, url, personal_context, created_at)`
  - `thought_objects(id, source_fragment_id FK, raw_text, created_at, updated_at)`
  - A thought-object's `raw_text` is the exact excerpt from the parent fragment. Raw wording is never mutated; every thought-object traces to its source.
  - Phase 2 adds metadata columns/JSONB to thought_objects without touching `raw_text`.

- **D-05:** **Worldview axes live in a `worldview_axes` table**, not a static enum.
  - Schema: `worldview_axes(id, name, min_label, max_label, description, display_order, deleted_at)`
  - Seeded with 5 defaults at `npm run db:seed`: agency/surrender, order/emergence, precision/mystery, market-value/moral-value, speed/depth.
  - Soft deletion via `deleted_at` to preserve historical scores when Phase 2 stores axis values.
  - Phase 2 stores worldview coordinates as `worldview_coordinates JSONB` in thought_objects, keyed by axis ID.

### Ingestion UX

- **D-06:** **Text-selection UX for splitting** (INGE-03). A `mouseup` handler on the rendered fragment view checks `window.getSelection()` for a non-empty selection. A "Save as thought-object" affordance appears (tooltip or sidebar button). The selection text becomes `thought_objects.raw_text` with `source_fragment_id` set to the parent.
- **D-07:** The user can also **save the entire fragment as a single thought-object** when no selection is needed — not every fragment requires splitting.
- **D-08:** Source metadata form (INGE-02) captures: source type (book/article/personal/web/other), title, author, citation, URL, and personal context note. All fields optional except raw text.

### Application Structure

- **D-09:** Three primary views in Phase 1:
  1. **Ingest view** — paste raw material, fill source metadata, save as source fragment
  2. **Fragment view** — read the fragment, select text, save thought-objects, view existing thought-objects
  3. **Axes view** — define, rename, and reorder worldview axes
- **D-10:** Phase 1 UI should be **functional, not polished**. Plain form-based layouts. No card animations, no rich visualization. The goal is a working vertical loop, not a polished product.

### Claude's Discretion

- Exact CSS approach (Tailwind vs. plain CSS modules) — either works for a functional Phase 1 UI
- Whether the Fragment view and Ingest view are one page or two routes
- Exact error handling verbosity in API routes
- Whether to use React Query or SWR for client-side fetching, or plain fetch + useState

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — core value, constraints, key decisions, and evolution protocol
- `.planning/REQUIREMENTS.md` — full requirement definitions for FOUN-01 through INGE-04 (Phase 1 scope)
- `.planning/ROADMAP.md` — phase structure, success criteria, and inter-phase dependencies

### Research and Architecture
- `.planning/research/STACK.md` — stack recommendation and rationale (Postgres + pgvector, Next.js, Drizzle, relational edges)
- `.planning/research/SUMMARY.md` — key constraints and pitfalls to avoid
- `.planning/research/PITFALLS.md` — what not to build and why

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a greenfield project. Phase 1 establishes the foundation.

### Established Patterns
- None yet — patterns defined in this phase become the baseline for subsequent phases.

### Integration Points
- `source_fragments` and `thought_objects` tables are the core entities consumed by every subsequent phase.
- `worldview_axes` table is consumed by Phase 2 (metadata extraction), Phase 3 (filtering), and generation (Phase 4).

</code_context>

<specifics>
## Specific Ideas

- Default worldview axes are: **agency vs. surrender**, **order vs. emergence**, **precision vs. mystery**, **market value vs. moral value**, **speed vs. depth** — seed these at initialization.
- The text-selection splitter must preserve the exact source wording character-for-character — no normalization, no trimming of interior whitespace.
- The source fragment view should display the full raw text in a readable, scrollable format (not truncated) to enable the selection workflow.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk import from markdown files** — IMPT-01, v2 requirement. Start with paste-based ingestion first.
- **Embedding generation** — Phase 2. Not needed until structuring pipeline.
- **Semantic search** — Phase 3.
- **Visual atlas / cluster browser** — Phase 5.
- **Relationship edges** — Phase 3 (RETR-04).
- **Auto-split on paragraph breaks** — may revisit if text-selection proves insufficient, but not in Phase 1.

</deferred>

---

*Phase: 1-Foundation and Ingestion*
*Context gathered: 2026-06-15*
