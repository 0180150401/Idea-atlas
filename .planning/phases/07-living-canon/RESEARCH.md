# RESEARCH.md — Phase 7: Living Canon

**Produced:** 2026-06-16
**Phase:** 7 — Living Canon
**Requirements:** CANON-01, CANON-02, CANON-03, CANON-04, CANON-05
**Status:** Ready for planner

---

## 1. Current Codebase State

**Confidence: HIGH** [VERIFIED: codebase grep + file reads]

### Stack
- Next.js 16.2.9 Pages Router + React 19
- Postgres + Drizzle ORM (^0.45.2)
- No AI/LLM SDK installed — `lib/atlas.ts` uses only local heuristics (keyword matching, hash-based embeddings, string templates)
- No graph DB — all relationships stored in flat SQL with FKs

### Ingestion Entry Points (Currently 3, Scattered)
| Entry Point | Table | What it does |
|---|---|---|
| `pages/index.tsx` | `sourceFragments` | Manual form: rawText, sourceType, title, author, citation, url, personalContext |
| `pages/studio.tsx` | `mediaItems` → auto-creates `sourceFragments` | File/text drop, auto-enriches metadata, links back via `sourceFragmentId` |
| `pages/fragments/[id].tsx` | `thoughtObjects` | Split fragment into atomic thought-objects via text selection |

CANON-01 requires collapsing these into one primary Living Canon section.

### Schema (Relevant Tables)

**`sourceFragments`**
```
id, rawText, sourceType (book|article|personal|web|other),
title?, author?, citation?, url?, personalContext?, createdAt
```
Missing: fragmentType differentiation (passage vs. marginalia vs. note vs. draft), personal relationship field, isPromoted flag, richer inferred metadata.

**`thoughtObjects`**
```
id, sourceFragmentId (FK), rawText, metadata (jsonb), status (raw|structured|embedded|ready),
worldviewCoordinates (jsonb), embedding (vector(8)), createdAt, updatedAt
```
`metadata` jsonb already holds: domains, claimType, stance, rhetoric, imagery, metaphorFamily, emotionalValence.

**`mediaItems`**
```
id, kind (text|image|audio|video|document|other), fileName?, mimeType?, sizeBytes?,
dataUrl?, extractedText?, metadata (jsonb), sourceFragmentId? (FK), createdAt
```
`metadata` jsonb holds: inferredTitle, keywords, domains, rhetoric, imagery, suggestedPrompt.

**`generationContexts`**
```
id, name, query?, filters (jsonb)?, thoughtObjectIds (jsonb), createdAt
```
Currently the "canon for generation" mechanism — stores which thought-object IDs feed generation.

### lib/atlas.ts — Metadata Extraction (All Heuristic)
[VERIFIED: codebase read]

- `extractMetadata(rawText)` — keyword matching for domains (6 hardcoded: attention, power, measurement, meaning, creativity, time); string-pattern detection for rhetoric; deterministic stance/claimType
- `enrichMediaMetadata(input)` — filename/text-based keyword extraction, first-line title inference, stop-word filtered keywords
- `embedText(rawText)` — 8-dim hash bucket; **not a real embedding model**; cosine similarity is approximate at best
- `draftBundle()` / `draftIteration()` — string templates, no LLM integration

**Critical finding:** All AI-looking features are heuristic stubs. Phase 7's CANON-03 (system infers metadata) may require real LLM calls for the first time in this codebase. This is the highest-risk gap.

---

## 2. Schema Changes Required for Phase 7

**Confidence: HIGH** [VERIFIED: schema gaps confirmed by direct read]

### Option A — Augment `sourceFragments` (Recommended)
Add columns to the existing table rather than creating a new `canonicalSources` table. Rationale: the planner already uses `sourceFragmentId` as the canonical link; adding a parallel table risks duplicating the ingestion pivot.

**New columns on `sourceFragments`:**
```sql
fragment_type  TEXT NOT NULL DEFAULT 'pasted-text'
  -- Values: book | article | passage | marginalia | note | draft | media | pasted-text

canon_relationship  TEXT
  -- Values: loved | resisted | formative | unresolved | guilty_influence | recurring_obsession
  -- Nullable: user may not have tagged it yet

is_promoted  BOOLEAN NOT NULL DEFAULT FALSE
  -- TRUE = included in active personal canon for generation

inferred_metadata  JSONB
  -- Holds: { title?, author?, sourceHints?, genreForm?, keywords[], motifs[],
  --          domains[], rhetoric[], affectiveRegister?, provenance?, quoteLeak? }
  -- Separate from user-supplied title/author to preserve provenance clearly
```

**Why keep `inferred_metadata` separate from `title`/`author`:** The project invariant is "Keep original source wording separate from extracted metadata." Same principle applies here — user-supplied fields stay canonical; AI inference goes into a separate jsonb blob so the user can inspect and override.

### Option B — New `canonEntries` Table
Create a canonical "work" record (title, author, year) separate from fragments. Useful if the user wants book-level metadata distinct from passage-level records. Deferred unless the discuss-phase confirms this need — adds relational complexity without immediate requirement coverage.

**Decision needed by discuss-phase:** Does the user want book-level records (a work has many passages) or is per-fragment enough?

---

## 3. Navigation Consolidation

**Confidence: HIGH** [VERIFIED: pages read]

### Current Navigation (index.tsx links)
- `/` — Ingest fragment (manual form)
- `/fragments/[id]` — Split into thought-objects
- `/atlas` — Atlas workbench + generation
- `/studio` — Media drop + iteration
- `/axes` — Worldview axis config

### Phase 7 Target (CANON-01)
A primary `/canon` page that serves as the unified Living Canon section. The old `/` page should either:
- Redirect to `/canon`, OR
- Become a minimal "quick add" widget inside `/canon`

**Recommended routing approach:**
- `pages/canon.tsx` — new primary section
- `pages/index.tsx` — redirects to `/canon` or shows it inline
- `/studio` can remain as a secondary "media" entry accessible from within the canon

**Risk:** The current nav links are inline in each page with no shared layout component. Adding `/canon` to nav means editing `index.tsx`, `studio.tsx`, `atlas.tsx`, `axes.tsx` — 4 files for nav updates. If a shared layout doesn't exist yet, this is a good time to add one (but adds scope).

---

## 4. Minimal-Input Ingestion (CANON-02)

**Confidence: HIGH** [VERIFIED: codebase + requirements read]

CANON-02 requires adding books, passages, marginalia, notes, drafts, media, and pasted text with **minimal required input**. Current form requires `rawText` + `sourceType` minimum — which is already minimal.

The gaps are:
1. No `fragmentType` distinction (marginalia vs. draft vs. passage) — **schema gap**
2. Media ingestion currently only lives in `/studio` — needs surfacing in `/canon`
3. File upload component exists in `studio.tsx` but is not a reusable component — copy/adapt needed

**Pattern to follow (from studio.tsx):**
- `POST /api/media-items` handles file upload → metadata enrichment → auto-creates sourceFragment
- This pipeline can be reused or adapted for `/canon`
- The only required field for `mediaItems` is `kind`; everything else is optional

**Minimum viable Canon entry form:**
1. A large text area (rawText — optional for media uploads)
2. A type selector (book / article / passage / marginalia / note / draft / pasted-text / media)
3. File drop zone for media types
4. Save triggers enrichment in background; user sees result immediately

---

## 5. Metadata Inference (CANON-03)

**Confidence: MEDIUM** [VERIFIED: lib/atlas.ts heuristics confirmed; LLM integration requirements are ASSUMED]

This is the most technically open requirement. CANON-03 asks the system to infer:
- title, source type, author/work hints, genre/form hints
- keywords, motifs, domains, rhetoric
- affective register, provenance
- quote-leakage sensitivity

### What works today (heuristic, no LLM):
- `extractMetadata()` → domains (6 hardcoded), rhetoric (pattern-based), imagery
- `enrichMediaMetadata()` → inferredTitle (first line), keywords (stop-word filter), domains

### What doesn't work today:
- Author/work identification from raw text
- Genre/form classification beyond rhetoric markers
- Motif extraction (semantic, not keyword)
- Affective register (emotional tone, not just valence)
- Quote-leakage sensitivity (detecting famous verbatim phrases)
- Provenance hints (inferring source from internal evidence)

### Options:

**Option A — Extend heuristics (no LLM) [ASSUMED: feasible for MVP]**
- Add author name dictionary matching
- Add genre-form classifier via keyword lists (essay, aphorism, lyric, manifesto, fragment)
- Add affective register via sentiment word lists
- Sufficient for CANON-03 partial coverage; quote-leakage detection remains weak

**Option B — Add real LLM inference [ASSUMED: requires new dependency]**
- Add Anthropic SDK (`@anthropic-ai/sdk`) or equivalent
- New API route: `POST /api/canon/infer` — accepts rawText, returns inferred metadata
- Prompt: extract title, author hints, genre/form, motifs, affective register, quote-leakage risk
- Store result in `inferred_metadata` jsonb on `sourceFragments`
- User reviews and accepts/overrides before promoting

**Option B is more aligned with the product vision** — "system infers" implies genuine AI inference, not keyword matching. However, it introduces the first external AI dependency in the codebase.

**Decision needed by discuss-phase:** Use heuristics-only or add LLM for canon inference?

If LLM: the existing `extractMetadata()` and `enrichMediaMetadata()` patterns should be refactored to call the new inference route rather than running inline.

---

## 6. Personal Relationship Tagging (CANON-04)

**Confidence: HIGH** [VERIFIED: schema + requirements read; enum values from REQUIREMENTS.md]

CANON-04 requires six relationship markers:
- `loved` | `resisted` | `formative` | `unresolved` | `guilty_influence` | `recurring_obsession`

This is purely a UI + schema addition. No AI required.

**Schema:** Add `canon_relationship TEXT` (nullable) to `sourceFragments` — see Section 2.
**UI:** A radio/button group on the canon entry card. Can be set on creation or edited later.
**API:** `PUT /api/fragments/[id]` already exists and accepts field updates — add `canonRelationship` to the handler.

No new API routes needed. Low risk.

---

## 7. Canon Promotion (CANON-05)

**Confidence: HIGH** [VERIFIED: generationContexts schema + requirements read]

CANON-05: User can promote selected fragments or sources into the active personal canon used for generation.

### Current Generation Context Mechanism
`generationContexts` stores `thoughtObjectIds[]` — a saved list of thought-object IDs used as generation input. This is the existing "active canon for generation" concept.

### Phase 7 Interpretation
Promotion should operate at the **source fragment** level (or eventually the work level), not just individual thought-objects. A promoted fragment means its derived thought-objects are preferentially included in generation.

**Implementation options:**

**Option A — `isPromoted` flag on sourceFragments (Recommended for Phase 7)**
- `is_promoted BOOLEAN DEFAULT FALSE` on `sourceFragments`
- Generation API filters by promoted fragments when building context
- Simple: no new table, no new join logic
- Limitation: doesn't give fine-grained control over which thought-objects within a fragment are promoted

**Option B — New `canonSet` join table**
- Links canonical sources/fragments to a named "active canon"
- More flexible for Phase 8 (Influence Atlas needs node selection for generation)
- More schema complexity than Phase 7 needs

**Recommend Option A for Phase 7; defer Option B to Phase 8 if needed.**

**UI:** Toggle on each canon entry card + a "Promoted" filtered view showing only promoted entries.

---

## 8. API Surface Needed

**Confidence: HIGH** [VERIFIED: existing routes + gap analysis]

### Existing routes usable as-is
- `GET /api/fragments` — list canon entries
- `POST /api/fragments` — create canon entry (needs `fragmentType`, `canonRelationship`, `isPromoted` added)
- `PUT /api/fragments/[id]` — update fields (needs new fields)
- `POST /api/media-items` — media ingestion (reusable)

### New routes needed
| Route | Purpose |
|---|---|
| `POST /api/fragments/[id]/infer` | Trigger metadata inference (heuristic or LLM); stores in `inferredMetadata` |
| `PUT /api/fragments/[id]/promote` | Toggle `isPromoted` on/off |
| `GET /api/canon` | List canon entries with filtering (promoted, type, relationship) — or extend `GET /api/fragments` with query params |

### Possible simplification
`GET /api/canon` can just be `GET /api/fragments?promoted=true&type=book` — no new route needed if query params are added to the existing list handler.

---

## 9. UI Architecture for `/canon`

**Confidence: MEDIUM** [ASSUMED: based on similar pages in codebase; no shared component system exists]

### What `/canon` needs (based on CANON-01 through CANON-05)
1. **Add entry** — Quick-add bar: text paste, file drop, type selector (minimal input)
2. **Canon list** — Cards showing: rawText preview, fragmentType badge, canonRelationship tag, isPromoted toggle, inferred metadata (collapsible)
3. **Filter/sort bar** — By type, relationship, promoted status
4. **Per-card actions:**
   - Trigger inference (CANON-03)
   - Set/change relationship (CANON-04)
   - Toggle promoted (CANON-05)
   - Open detail (split into thoughts, view full text)
5. **Promoted view** — A distinct "Active Canon" panel showing only promoted entries

### Component pattern in codebase
All pages are monolithic `.tsx` files — `atlas.tsx` is 800+ lines with all sections inline. No shared UI component library. Phase 7 can follow this pattern for speed.

### Risk: page complexity
`atlas.tsx` is already complex. `/canon` will be similarly complex. Keep sections collapsible or tab-based to avoid an unwieldy page.

---

## 10. Open Questions for Discuss-Phase

These are decisions the planner needs user input on before locking the plan:

1. **LLM inference vs. extended heuristics** (CANON-03): Add `@anthropic-ai/sdk` for real inference, or extend keyword matching? This changes both the dependency surface and the quality of metadata.

2. **Book-level records** (CANON-02): Does the user want a separate "Work" record (Nietzsche's *Twilight of Idols* as a work with many passages underneath), or is per-fragment enough for this phase?

3. **Navigation restructure scope**: Create a `/canon` page + update nav links across all pages, or embed the canon section within the existing index page?

4. **Inference trigger**: Auto-infer on save, or user-triggered via "Infer" button after pasting?

5. **`generationContexts` relationship to promotion**: Should "promoting" a fragment automatically add its thought-objects to a default generation context, or stay decoupled?

---

## 11. Pitfalls and Risks

**Confidence: HIGH** [VERIFIED: codebase + schema analysis]

| Risk | Level | Notes |
|---|---|---|
| LLM inference adds first external API dependency | HIGH | Must handle rate limits, cost, latency; infer on-demand not on every save |
| Schema migration on live data | MEDIUM | 3 new columns on `sourceFragments`; existing rows need defaults; Drizzle migration required |
| Nav spread (4 pages need link updates) | LOW | No shared layout; tedious but mechanical |
| `isPromoted` + `generationContexts` are two separate mechanisms | MEDIUM | Risk of confusion: user promotes fragment but generation still uses explicit context IDs; need clear UX distinction |
| Hash-based embeddings are non-semantic | MEDIUM | Cosine similarity in search is unreliable; already a known limitation; not Phase 7's problem but inferred metadata may surface this again |
| Media ingestion reuse from `/studio` | LOW | Logic exists in `api/media-items`; just needs surfacing in `/canon` UI |

---

## Summary for Planner

**What Phase 7 adds to the existing MVP:**
1. **Schema**: 4 new columns on `sourceFragments` (`fragmentType`, `canonRelationship`, `isPromoted`, `inferredMetadata`)
2. **New page**: `/canon` — unified ingestion, browsing, tagging, and promotion UI
3. **New API routes**: inference trigger + promote toggle (or extend existing)
4. **Nav update**: 4 existing pages need `/canon` link
5. **Optional new dependency**: `@anthropic-ai/sdk` for real metadata inference

**Smallest defensible scope for CANON-01–05:**
- New `/canon` page with add form + list + relationship tags + promote toggle
- Schema migration (4 columns)
- Inference via extended heuristics (no LLM — defer to discuss-phase)
- `GET /api/fragments` with filter params (no new route)
- `PUT /api/fragments/[id]` handles all field updates

**Biggest risk:** CANON-03 inference quality. If heuristics are accepted as "good enough for v1.1," the phase is a clean UI + schema addition. If real LLM inference is required, it introduces the project's first external API dependency and changes error handling patterns across the board.
