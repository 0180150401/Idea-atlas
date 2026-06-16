# Phase 7 Plan: Living Canon

**Phase:** 7 — Living Canon
**Created:** 2026-06-16
**Requirements:** CANON-01, CANON-02, CANON-03, CANON-04, CANON-05

---

## Context Decisions (from Research)

No CONTEXT.md exists for Phase 7 (no discuss-phase session was run). The following decisions are derived from the research findings and project invariants. They are locked for this plan.

| ID | Decision |
|----|----------|
| D-01 | Add 4 new columns to `source_fragments` — do NOT create a new `canonEntries` or `canonicalSources` table (Option A from research) |
| D-02 | Metadata inference uses **extended heuristics only** — no LLM dependency added in Phase 7 (deferring `@anthropic-ai/sdk` to Phase 9 where generation already needs it) |
| D-03 | Create `pages/canon.tsx` as the new primary section; `pages/index.tsx` redirects to `/canon` |
| D-04 | Canon promotion uses `is_promoted` flag on `sourceFragments` (Option A); `generationContexts` stays decoupled — promotion does NOT auto-populate a context |
| D-05 | No shared layout component introduced — follow existing per-page nav pattern (update 4 pages) |
| D-06 | `GET /api/fragments` extended with query params (`?promoted=true&fragmentType=book`) — no separate `GET /api/canon` route |
| D-07 | Inference trigger is user-triggered ("Infer" button), not automatic on save |

**Hard invariants (inherited):**
- `source_fragments.raw_text` must never be mutated, trimmed, or normalized.
- `inferred_metadata` is stored separately from user-supplied `title`/`author` — never merge them.
- Store exactly what the user pastes — no automatic transforms.

---

## Dependency Graph

```
Wave 1: T1 (schema migration)
         ↓
Wave 2: T2 ──── T3   (API routes — parallel; both depend on new schema columns)
         ↓       ↓
Wave 3:      T4       (canon page UI — depends on T2 + T3)
              ↓
Wave 4:      T5       (nav updates + index redirect — depends on T4 existing)
```

---

## Wave 1 — Schema Migration (blocking)

### T1: Extend `sourceFragments` with 4 New Columns

**Goal:** Add `fragment_type`, `canon_relationship`, `is_promoted`, and `inferred_metadata` to `source_fragments`. Existing rows get safe defaults.

**Steps:**

1. Open `db/schema.ts`. Add 4 new columns to the `sourceFragments` table definition:

   ```typescript
   // In the sourceFragments pgTable(...) definition, add after personalContext:
   fragmentType: text('fragment_type').notNull().default('pasted-text'),
   // Values: book | article | passage | marginalia | note | draft | media | pasted-text

   canonRelationship: text('canon_relationship'),
   // Values: loved | resisted | formative | unresolved | guilty_influence | recurring_obsession
   // Nullable — user may not have tagged it yet

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
   }>(),
   ```

   Import `boolean` from `'drizzle-orm/pg-core'` (add to existing import line).

2. Generate and run the migration:
   ```
   npm run db:generate
   npm run db:migrate
   ```

3. Verify the migration applied:
   - The `source_fragments` table now has columns: `fragment_type`, `canon_relationship`, `is_promoted`, `inferred_metadata`.
   - Existing rows have `fragment_type = 'pasted-text'` and `is_promoted = false`.

**Done when:**
- `npm run db:generate` produces a new migration file in `drizzle/`
- `npm run db:migrate` runs without error
- TypeScript in `db/schema.ts` compiles without errors (`npx tsc --noEmit`)
- Existing rows in `source_fragments` have `fragment_type = 'pasted-text'` and `is_promoted = false`

---

## Wave 2 — API Routes (parallel after T1)

### T2: Extend Fragment CRUD + Add Inference Route

**Goal:** `POST /api/fragments` and `PUT /api/fragments/[id]` accept new fields. New route `POST /api/fragments/[id]/infer` runs heuristic enrichment and stores result in `inferred_metadata`.

#### 2a — Update `pages/api/fragments/index.ts`

**GET `/api/fragments`** — Add query param support for filtering:
- `?promoted=true` — filter `where(eq(sourceFragments.isPromoted, true))`
- `?fragmentType=book` — filter `where(eq(sourceFragments.fragmentType, 'book'))`
- `?canonRelationship=formative` — filter by relationship
- Params are optional; no params = return all (existing behavior preserved)

```typescript
// At the top of the GET handler, before the select:
const { promoted, fragmentType, canonRelationship } = req.query
const conditions = []
if (promoted === 'true') conditions.push(eq(sourceFragments.isPromoted, true))
if (fragmentType) conditions.push(eq(sourceFragments.fragmentType, fragmentType as string))
if (canonRelationship) conditions.push(eq(sourceFragments.canonRelationship, canonRelationship as string))

const rows = await db
  .select()
  .from(sourceFragments)
  .where(conditions.length ? and(...conditions) : undefined)
  .orderBy(desc(sourceFragments.createdAt))
```

Import `and` from `'drizzle-orm'`.

**POST `/api/fragments`** — Accept new fields in body:
```typescript
const { rawText, sourceType, title, author, citation, url, personalContext,
        fragmentType, canonRelationship, isPromoted } = req.body
// rawText still required; fragmentType defaults to 'pasted-text' if not provided
await db.insert(sourceFragments).values({
  rawText, sourceType,
  title, author, citation, url, personalContext,
  fragmentType: fragmentType ?? 'pasted-text',
  canonRelationship: canonRelationship ?? null,
  isPromoted: isPromoted ?? false,
}).returning()
```

#### 2b — Update `pages/api/fragments/[id].ts`

**PUT `/api/fragments/[id]`** — Accept new updatable fields:
```typescript
const { sourceType, title, author, citation, url, personalContext,
        fragmentType, canonRelationship, isPromoted } = req.body
// rawText intentionally still omitted
await db.update(sourceFragments)
  .set({ sourceType, title, author, citation, url, personalContext,
         fragmentType, canonRelationship, isPromoted })
  .where(eq(sourceFragments.id, id))
  .returning()
```

#### 2c — Create `pages/api/fragments/[id]/infer.ts`

**POST `/api/fragments/[id]/infer`** — Runs heuristic metadata inference on the fragment's `rawText` and stores in `inferred_metadata`. No LLM; extend the existing `lib/atlas.ts` heuristics.

File: `pages/api/fragments/[id]/infer.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { inferCanonMetadata } from '@/lib/atlas'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, id))
  if (!fragment) return res.status(404).json({ error: 'Fragment not found' })

  const inferred = inferCanonMetadata(fragment.rawText, fragment.fragmentType)

  const [updated] = await db
    .update(sourceFragments)
    .set({ inferredMetadata: inferred })
    .where(eq(sourceFragments.id, id))
    .returning()

  return res.status(200).json(updated)
}
```

**Add `inferCanonMetadata` to `lib/atlas.ts`:**

This function should return an `inferredMetadata` shape. Use heuristics only — no LLM.

```typescript
export function inferCanonMetadata(rawText: string, fragmentType?: string | null): {
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
} {
  const text = rawText.toLowerCase()
  const lines = rawText.split('\n').filter(l => l.trim())

  // Title: first non-empty line if short enough
  const title = lines[0] && lines[0].length < 120 ? lines[0].trim() : undefined

  // Domains: reuse existing keyword-domain map from extractMetadata
  const existing = extractMetadata(rawText)
  const domains = existing.domains as string[] | undefined

  // Rhetoric: reuse existing detection
  const rhetoric = existing.rhetoric ? [existing.rhetoric as string] : undefined

  // Genre/form heuristics
  const genreFormMap: Record<string, string[]> = {
    'aphorism': ['aphorism', 'maxim', 'adage', 'proverb'],
    'essay': ['essay', 'argues', 'I contend', 'the question is', 'one must ask'],
    'manifesto': ['manifesto', 'we demand', 'we declare', 'it is time'],
    'lyric': ['I feel', 'I sense', 'I see', 'I hear'],
    'fragment': ['...', '—', '(unfinished', '[fragment'],
  }
  let genreForm: string | undefined
  for (const [form, markers] of Object.entries(genreFormMap)) {
    if (markers.some(m => text.includes(m.toLowerCase()))) {
      genreForm = form
      break
    }
  }

  // Affective register: simple sentiment word lists
  const positiveWords = ['joy', 'beauty', 'love', 'wonder', 'sublime', 'radiant', 'light', 'hope']
  const negativeWords = ['dread', 'grief', 'decay', 'death', 'darkness', 'fear', 'ruin', 'despair']
  const tensionWords = ['paradox', 'contradiction', 'tension', 'despite', 'yet', 'however', 'ambivalent']
  const posScore = positiveWords.filter(w => text.includes(w)).length
  const negScore = negativeWords.filter(w => text.includes(w)).length
  const tenScore = tensionWords.filter(w => text.includes(w)).length
  let affectiveRegister: string | undefined
  if (tenScore >= 2) affectiveRegister = 'tension'
  else if (posScore > negScore) affectiveRegister = 'affirmative'
  else if (negScore > posScore) affectiveRegister = 'elegiac'

  // Quote-leakage risk: heuristic — if text contains quotation marks around long phrases
  const quotePattern = /"[^"]{40,}"/g
  const quoteLeak = quotePattern.test(rawText) ? 'possible-verbatim' : undefined

  // Keywords: reuse enrichMediaMetadata keyword extraction (stop-word filtered)
  const enriched = enrichMediaMetadata({ text: rawText, fileName: undefined })
  const keywords = enriched.keywords as string[] | undefined

  return {
    ...(title && { title }),
    ...(domains?.length && { domains }),
    ...(rhetoric?.length && { rhetoric }),
    ...(genreForm && { genreForm }),
    ...(affectiveRegister && { affectiveRegister }),
    ...(quoteLeak && { quoteLeak }),
    ...(keywords?.length && { keywords }),
  }
}
```

**Note:** `inferCanonMetadata` calls existing `extractMetadata` and `enrichMediaMetadata` from `lib/atlas.ts`. Add it to the same file. Do not restructure existing functions.

**Done when:**
- `GET /api/fragments?promoted=true` returns only promoted fragments
- `GET /api/fragments?fragmentType=book` returns only book-type fragments
- `POST /api/fragments` accepts `fragmentType`, `canonRelationship`, `isPromoted`
- `PUT /api/fragments/[id]` accepts and persists `fragmentType`, `canonRelationship`, `isPromoted`
- `POST /api/fragments/[id]/infer` returns the fragment with `inferredMetadata` populated
- TypeScript compiles without errors

---

### T3: Canon Promote Route

**Goal:** Dedicated toggle endpoint for `isPromoted` to keep the UI interaction clean.

**File:** `pages/api/fragments/[id]/promote.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, id))
  if (!fragment) return res.status(404).json({ error: 'Fragment not found' })

  const [updated] = await db
    .update(sourceFragments)
    .set({ isPromoted: !fragment.isPromoted })
    .where(eq(sourceFragments.id, id))
    .returning()

  return res.status(200).json(updated)
}
```

**Done when:**
- `PUT /api/fragments/[id]/promote` toggles `is_promoted` on the row
- Calling it twice returns to original state
- Returns 404 for unknown IDs

---

## Wave 3 — Canon Page UI (after T2 + T3)

### T4: `pages/canon.tsx` — Living Canon Section

**Goal:** A single page that unifies all ingestion entry points and satisfies CANON-01 through CANON-05.

**File:** `pages/canon.tsx`

This is a monolithic page component following the existing pattern (see `atlas.tsx`, `studio.tsx`). Build all sections inline — no new shared components.

#### Section 1: Add Entry (CANON-02)

A quick-add form at the top of the page:

```
[ Large textarea — paste text here ]

Fragment type: [ select: pasted-text | book | article | passage | marginalia | note | draft | media ]

[ Save Entry ]   (POSTs to /api/fragments)
```

- `rawText` required for non-media types; show inline error if empty
- `fragmentType` defaults to `'pasted-text'`
- On save: POST to `/api/fragments`, reload the list, clear the form
- Media upload: show a file `<input type="file">` when `fragmentType === 'media'`. On file select:
  1. POST the file to `POST /api/media-items` (existing endpoint — reuse from studio)
  2. The media-items API auto-creates a `sourceFragment` — reload the list after response

#### Section 2: Filter Bar (CANON-01)

A horizontal row of filter toggles above the list:

```
[ All ]  [ Promoted ]  [ Book ]  [ Article ]  [ Note ]  [ Draft ]  [ Media ]
Personal relationship: [ All ] [ Loved ] [ Resisted ] [ Formative ] [ Unresolved ] [ Guilty ] [ Recurring ]
```

- Active filter is highlighted
- Changing a filter calls `GET /api/fragments?promoted=...&fragmentType=...&canonRelationship=...`
- Reset button clears all filters

State: `activeFilter: { promoted?: boolean, fragmentType?: string, canonRelationship?: string }`

#### Section 3: Promoted Canon Panel (CANON-05)

A collapsible aside panel (visible by default, toggle with a button):

```
[ Active Canon (N promoted) ]  [ ▾ collapse ]

  ┌──────────────────────────────────────────┐
  │ [entry title/preview]   [remove]          │
  │ [entry title/preview]   [remove]          │
  └──────────────────────────────────────────┘
```

- Shows only entries where `isPromoted === true`
- "Remove" button calls `PUT /api/fragments/[id]/promote` (toggles off)
- Displays count in header

#### Section 4: Canon Entry Cards (CANON-01, CANON-03, CANON-04, CANON-05)

Each entry is a card in a vertical list. Cards show:

```
┌─────────────────────────────────────────────────────────┐
│ [fragmentType badge]  [canonRelationship badge if set]   │
│                                                          │
│ Title or first 120 chars of rawText...                   │
│                                                          │
│ Author: ...   Created: ...                               │
│                                                          │
│ [ ★ Promote / ☆ Remove ]  [ Infer Metadata ]            │
│ [ Set Relationship ▾ ]    [ → View in Fragments ]        │
│                                                          │
│ ▾ Inferred Metadata (collapsed by default)               │
│   keywords: ...  domains: ...  genreForm: ...            │
│   affectiveRegister: ...  quoteLeak: ...                 │
└─────────────────────────────────────────────────────────┘
```

**Per-card interactions:**

1. **Promote toggle (CANON-05):** Star/unstar icon. Calls `PUT /api/fragments/[id]/promote`. Updates card state optimistically.

2. **Infer Metadata button (CANON-03):** Calls `POST /api/fragments/[id]/infer`. On success, expand the inferred metadata section and show the results. Button becomes "Re-infer" after first inference.

3. **Set Relationship dropdown (CANON-04):** A `<select>` or button group with 6 options:
   - `loved` | `resisted` | `formative` | `unresolved` | `guilty_influence` | `recurring_obsession`
   - Plus "— unset —"
   - On change: `PUT /api/fragments/[id]` with `{ canonRelationship: value }`
   - Display the selected relationship as a colored badge on the card

4. **View in Fragments link:** `<Link href={/fragments/${id}}>` — opens existing detail page.

5. **Inferred metadata section (CANON-03):** Collapsible. Shows:
   - `title`, `genreForm`, `affectiveRegister`, `quoteLeak` (if present)
   - `keywords` as pills
   - `domains` as pills
   - `rhetoric` as pills

**State shape for this page:**
```typescript
type CanonEntry = {
  id: string
  rawText: string
  sourceType: string
  title: string | null
  author: string | null
  fragmentType: string
  canonRelationship: string | null
  isPromoted: boolean
  inferredMetadata: Record<string, unknown> | null
  createdAt: string
}
```

**Done when:**
- `/canon` loads and shows all existing fragments from `GET /api/fragments`
- Add Entry form saves a new fragment and it appears in the list
- Filter bar filters the list by type and relationship
- Promoted panel shows only promoted entries
- Promote toggle updates `isPromoted` and moves entry in/out of the panel
- Infer button triggers inference and displays results in the card
- Relationship selector saves and displays the badge
- "View in Fragments" link navigates to the existing fragment detail page
- `npm run build` passes

---

## Wave 4 — Navigation and Redirect (after T4)

### T5: Nav Updates + Index Redirect

**Goal:** All pages show a `/canon` nav link. `pages/index.tsx` redirects to `/canon`.

#### 5a — Update `pages/index.tsx`

Replace the entire page content with a redirect:

```typescript
// pages/index.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/canon')
  }, [router])
  return null
}
```

#### 5b — Add `/canon` link to nav in existing pages

Each page has inline nav links. Add `<Link href="/canon">Canon</Link>` to the nav in:

1. `pages/atlas.tsx` — add between existing links
2. `pages/studio.tsx` — add between existing links
3. `pages/axes.tsx` — add between existing links
4. `pages/fragments/[id].tsx` — add between existing links

Consistent ordering suggestion: `Canon | Atlas | Studio | Axes`

**Done when:**
- Navigating to `/` redirects to `/canon`
- All 4 pages show a working `/canon` nav link
- `npm run build` passes

---

## Verification: Phase 7 Complete

Run all of the following before marking Phase 7 complete.

### SC-1: Navigation (CANON-01)
- Open `http://localhost:3000` — browser redirects to `/canon`
- `/canon` page loads without error
- Nav links in Atlas, Studio, Axes, and Fragment detail all include "Canon" and navigate correctly

### SC-2: Add Entry with Fragment Type (CANON-02)
- Paste text into the add form, select `fragmentType = 'marginalia'`, click Save
- New card appears in the list with the `marginalia` badge
- Filter to `Marginalia` — only that card appears

### SC-3: Metadata Inference (CANON-03)
- Click "Infer Metadata" on a card with substantial rawText
- The inferred metadata section expands with at least one non-empty field (`keywords`, `domains`, or `genreForm`)
- Refresh the page — inferred metadata persists (stored in DB)

### SC-4: Personal Relationship (CANON-04)
- Open the Set Relationship dropdown on a card, select `formative`
- Card shows `formative` badge
- Filter by `Formative` — only that card appears
- Refresh — relationship persists

### SC-5: Promote to Canon (CANON-05)
- Click Promote on a card — star fills, card appears in the Active Canon panel
- Click again — star clears, card leaves the panel
- Filter to `Promoted` — only promoted cards appear
- `GET /api/fragments?promoted=true` in browser returns only promoted entries

### SC-6: Build
- `npm run build` completes without TypeScript errors or missing module errors

---

## Constraints for Implementer

- **Never** set `inferredMetadata` as the primary source of truth for `title` or `author` — those user-supplied columns remain canonical.
- **Never** auto-trigger inference on save — only on explicit "Infer Metadata" click.
- **Never** hard-delete `sourceFragments` in this phase.
- Toggling `isPromoted` does NOT modify `generationContexts` — these are decoupled mechanisms.
- The `fragmentType` column value must come from the fixed set: `book | article | passage | marginalia | note | draft | media | pasted-text`. Enforce this in the UI selector, not the DB (no enum constraint needed yet).
- File path for the new inference route: `pages/api/fragments/[id]/infer.ts` — this requires creating the `[id]` directory under `pages/api/fragments/`. Ensure `pages/api/fragments/[id].ts` is renamed to `pages/api/fragments/[id]/index.ts` if Next.js routing conflicts arise (dynamic segment file vs. directory).

### Next.js Route Conflict Resolution
The current file structure has `pages/api/fragments/[id].ts` (a file). Adding `pages/api/fragments/[id]/infer.ts` and `pages/api/fragments/[id]/promote.ts` requires `[id]` to be a directory, not a file.

**Required rename before creating sub-routes:**
1. Rename `pages/api/fragments/[id].ts` → `pages/api/fragments/[id]/index.ts`
2. Then create `pages/api/fragments/[id]/infer.ts`
3. Then create `pages/api/fragments/[id]/promote.ts`

Verify: `GET /api/fragments/[id]` and `PUT /api/fragments/[id]` still work after rename.

---

*Plan created: 2026-06-16*
*Phase: 7 — Living Canon*
