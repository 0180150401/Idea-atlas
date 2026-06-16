# Phase 1 Plan: Foundation and Ingestion

**Phase:** 1 — Foundation and Ingestion
**Created:** 2026-06-15
**Requirements:** FOUN-01, FOUN-02, FOUN-03, INGE-01, INGE-02, INGE-03, INGE-04

---

## Locked Decisions (NON-NEGOTIABLE)

Read `.planning/phases/01-foundation-and-ingestion/01-CONTEXT.md` before implementing anything. The following are locked and must not be re-opened:

| ID | Decision |
|----|----------|
| D-01 | Next.js Pages Router + TypeScript |
| D-02 | Drizzle ORM (drizzle-orm + drizzle-kit) |
| D-03 | Docker Compose with `pgvector/pgvector:pg16` from day 1 — no SQLite |
| D-04 | Two tables: `source_fragments` + `thought_objects` |
| D-05 | Dynamic `worldview_axes` table, soft deletion, 5 seeded defaults |
| D-06 | Text-selection UX via `mouseup` + `window.getSelection()` |
| D-07 | Whole-fragment save also supported |
| D-08 | Source metadata: type, title, author, citation, URL, personal context |
| D-09 | Three views: Ingest, Fragment, Axes |
| D-10 | Functional UI, not polished |

**Hard invariant:** `thought_objects.raw_text` and `source_fragments.raw_text` must never be mutated, trimmed (interior whitespace), or normalized. Store exactly what the user selects or pastes.

---

## Dependency Graph

```
Wave 1: T1 (scaffold + infra)
         ↓
Wave 2: T2 (schema + migration + seed)
         ↓
Wave 3: T3 ──── T4 ──── T5   (API routes, all parallel)
         ↓       ↓       ↓
Wave 4: T6 ──── T7 ──── T8   (UI views, all parallel after Wave 3)
```

---

## Wave 1 — Infrastructure (run first, blocking)

### T1: Project Scaffold + Docker + Drizzle Config

**Goal:** A running Next.js app with Postgres reachable at `DATABASE_URL` and Drizzle configured.

**Steps:**

1. In `/Users/sebroda/Idea-atlas`, initialize a new Next.js project:
   ```
   npx create-next-app@latest . --typescript --no-app --no-src-dir --no-tailwind --no-eslint --import-alias "@/*"
   ```
   If the directory already has files, scaffold in a temp dir and merge manually.

2. Install runtime deps:
   ```
   npm install drizzle-orm postgres
   npm install -D drizzle-kit tsx
   ```

3. Create `docker-compose.yml` at repo root:
   ```yaml
   version: '3.8'
   services:
     db:
       image: pgvector/pgvector:pg16
       environment:
         POSTGRES_DB: idea_atlas
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   ```

4. Create `.env.local` at repo root:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/idea_atlas
   ```
   Add `.env.local` to `.gitignore` if not already there.

5. Create `drizzle.config.ts` at repo root:
   ```typescript
   import { defineConfig } from 'drizzle-kit'

   export default defineConfig({
     schema: './db/schema.ts',
     out: './drizzle',
     dialect: 'postgresql',
     dbCredentials: {
       url: process.env.DATABASE_URL!,
     },
   })
   ```

6. Create `db/index.ts`:
   ```typescript
   import { drizzle } from 'drizzle-orm/postgres-js'
   import postgres from 'postgres'

   const client = postgres(process.env.DATABASE_URL!)
   export const db = drizzle(client)
   ```

7. Add scripts to `package.json`:
   ```json
   "db:generate": "drizzle-kit generate",
   "db:migrate": "drizzle-kit migrate",
   "db:push": "drizzle-kit push",
   "db:seed": "tsx db/seed.ts"
   ```

**Done when:**
- `docker compose up -d` starts Postgres without error
- `npm run dev` starts the Next.js dev server without error
- `db/index.ts` exports `db` without TypeScript errors

---

## Wave 2 — Schema, Migration, Seed (run after T1)

### T2: Database Schema + Migration + Seed Data

**Goal:** All three tables exist in Postgres with correct columns, constraints, and seed data.

**Steps:**

1. Create `db/schema.ts` with exactly these three tables:

   ```typescript
   import { pgTable, uuid, text, timestamptz, integer } from 'drizzle-orm/pg-core'

   export const sourceFragments = pgTable('source_fragments', {
     id: uuid('id').primaryKey().defaultRandom(),
     rawText: text('raw_text').notNull(),
     sourceType: text('source_type').notNull(), // book | article | personal | web | other
     title: text('title'),
     author: text('author'),
     citation: text('citation'),
     url: text('url'),
     personalContext: text('personal_context'),
     createdAt: timestamptz('created_at').notNull().defaultNow(),
   })

   export const thoughtObjects = pgTable('thought_objects', {
     id: uuid('id').primaryKey().defaultRandom(),
     sourceFragmentId: uuid('source_fragment_id')
       .notNull()
       .references(() => sourceFragments.id),
     rawText: text('raw_text').notNull(),
     createdAt: timestamptz('created_at').notNull().defaultNow(),
     updatedAt: timestamptz('updated_at').notNull().defaultNow(),
   })

   export const worldviewAxes = pgTable('worldview_axes', {
     id: uuid('id').primaryKey().defaultRandom(),
     name: text('name').notNull(),
     minLabel: text('min_label').notNull(),
     maxLabel: text('max_label').notNull(),
     description: text('description'),
     displayOrder: integer('display_order').notNull().default(0),
     deletedAt: timestamptz('deleted_at'), // soft delete only
   })
   ```

   **Do not add any extra columns.** Phase 2 adds `metadata JSONB`, `status`, `worldview_coordinates JSONB`, `embedding` to `thought_objects` via its own migration.

2. Run migrations:
   ```
   docker compose up -d
   npm run db:generate
   npm run db:migrate
   ```

3. Create `db/seed.ts` that inserts the 5 default worldview axes (only if the table is empty, use `ON CONFLICT DO NOTHING` or a count check):
   ```typescript
   import { db } from './index'
   import { worldviewAxes } from './schema'

   const defaults = [
     { name: 'Agency vs. Surrender',     minLabel: 'agency',       maxLabel: 'surrender',     displayOrder: 0 },
     { name: 'Order vs. Emergence',      minLabel: 'order',        maxLabel: 'emergence',     displayOrder: 1 },
     { name: 'Precision vs. Mystery',    minLabel: 'precision',    maxLabel: 'mystery',       displayOrder: 2 },
     { name: 'Market Value vs. Moral Value', minLabel: 'market value', maxLabel: 'moral value', displayOrder: 3 },
     { name: 'Speed vs. Depth',          minLabel: 'speed',        maxLabel: 'depth',         displayOrder: 4 },
   ]

   const existing = await db.select().from(worldviewAxes)
   if (existing.length === 0) {
     await db.insert(worldviewAxes).values(defaults)
     console.log('Seeded 5 default worldview axes')
   } else {
     console.log('Seed skipped — worldview_axes not empty')
   }
   process.exit(0)
   ```

4. Run seed:
   ```
   npm run db:seed
   ```

**Done when:**
- `psql` or any Postgres client shows `source_fragments`, `thought_objects`, `worldview_axes` tables with correct columns
- `SELECT * FROM worldview_axes` returns exactly 5 rows
- FK constraint on `thought_objects.source_fragment_id` is enforced at the DB level

---

## Wave 3 — API Routes (run after T2, all three in parallel)

### T3: Fragments API

**File locations:**
- `pages/api/fragments/index.ts` — GET (list all, newest first), POST (create)
- `pages/api/fragments/[id].ts` — GET (one), PUT (update source metadata only — never `raw_text`)

**GET /api/fragments** — return all source fragments ordered by `created_at DESC`.

**POST /api/fragments** — body: `{ rawText, sourceType, title?, author?, citation?, url?, personalContext? }`. `rawText` and `sourceType` are required. Return created record. **Store `rawText` exactly as received — do not trim or normalize.**

**GET /api/fragments/[id]** — return one fragment plus its thought-objects (join or separate query).

**PUT /api/fragments/[id]** — update allowed fields: `sourceType`, `title`, `author`, `citation`, `url`, `personalContext`. **Do not allow `rawText` to be updated.** Return updated record.

**Done when:**
- POST creates a fragment and persists across server restart
- GET list returns fragments newest first
- GET one returns fragment + its thought-objects
- PUT rejects attempts to change `raw_text` (either by ignoring that field or returning 400)

---

### T4: Thought-Objects API

**File locations:**
- `pages/api/thought-objects/index.ts` — POST (create)
- `pages/api/thought-objects/[id].ts` — GET (one), PUT (update)

**POST /api/thought-objects** — body: `{ sourceFragmentId, rawText }`. Validate that `sourceFragmentId` exists in `source_fragments`. **Store `rawText` exactly as received — no normalization.** Return created record.

**GET /api/thought-objects/[id]** — return one thought-object.

**PUT /api/thought-objects/[id]** — body may include `rawText`. `rawText` CAN be updated here (the user may refine their exact selection). Update `updated_at` on every PUT. Return updated record.

**Done when:**
- POST with valid `sourceFragmentId` creates a thought-object
- POST with invalid `sourceFragmentId` returns 400 or 404
- PUT updates `rawText` and `updated_at`

---

### T5: Worldview Axes API

**File locations:**
- `pages/api/axes/index.ts` — GET (list active), POST (create new)
- `pages/api/axes/[id].ts` — PUT (update name/labels/description/displayOrder), DELETE (soft delete)

**GET /api/axes** — return all axes where `deleted_at IS NULL`, ordered by `display_order ASC`.

**POST /api/axes** — body: `{ name, minLabel, maxLabel, description?, displayOrder? }`. `name`, `minLabel`, `maxLabel` required. Return created record.

**PUT /api/axes/[id]** — update any combination of `name`, `minLabel`, `maxLabel`, `description`, `displayOrder`. Return updated record.

**DELETE /api/axes/[id]** — set `deleted_at = NOW()`. Do not hard-delete. Return `{ success: true }`.

**Done when:**
- GET returns 5 seeded axes on a fresh database
- DELETE soft-deletes (row still in table, `deleted_at` set)
- Hard-deleted axis is excluded from GET list

---

## Wave 4 — UI Views (run after Wave 3, all three in parallel)

Use whatever CSS approach is fastest to produce a working layout (Tailwind via CDN or plain inline styles are both acceptable for Phase 1). D-10: functional, not polished.

### T6: Ingest View

**Route:** `pages/index.tsx` (or `pages/ingest.tsx`)

**What it does:**
1. A `<textarea>` for pasting raw material (large, scrollable)
2. A source metadata form below the textarea: source type (select: book/article/personal/web/other), title, author, citation, URL, personal context
3. A "Save fragment" button that POSTs to `/api/fragments` and clears the form on success
4. A list of recent fragments (fetch GET `/api/fragments` on mount) — show title or first 80 chars of `raw_text`, plus link to the Fragment view
5. Basic error display if POST fails

**Navigation:** clicking a fragment in the list navigates to `/fragments/[id]`.

**Done when:**
- User can paste text, fill metadata fields (all optional except raw text), and click Save
- Fragment appears in the list immediately after save
- Fragment persists across page refresh
- Clicking a fragment navigates to its detail view

---

### T7: Fragment View

**Route:** `pages/fragments/[id].tsx`

**What it does:**
1. Fetch the fragment by ID (GET `/api/fragments/[id]`). Display full `raw_text` in a scrollable, readable block (not truncated).
2. Display source metadata below the text (title, author, citation, URL, personal context, source type). Provide an inline edit form for source metadata that PUTs to `/api/fragments/[id]`.
3. **Text-selection splitter:**
   - Attach `mouseup` listener to the fragment text container
   - On mouseup: call `window.getSelection()`. If selection is non-empty and non-collapsed, show a "Save as thought-object" button (tooltip, floating button, or sidebar — any visible affordance)
   - On button click: POST to `/api/thought-objects` with `{ sourceFragmentId: id, rawText: selection.toString() }`. **Do not trim, do not normalize.** Hide the affordance after save.
   - On mouseup with empty selection: hide the affordance
4. A "Save whole fragment as thought-object" button that does the same POST with `rawText = fragment.rawText` (for D-07)
5. A list of existing thought-objects for this fragment, shown below the raw text. Each thought-object shows its `raw_text` and an inline edit field (PUT `/api/thought-objects/[id]`).

**Done when:**
- Full raw text displays without truncation
- Selecting text reveals a save affordance
- Clicking save creates a thought-object that appears in the list
- The saved thought-object's `raw_text` exactly matches the selection (verify by copying from the displayed thought-object and comparing character-for-character)
- Whole-fragment save works
- Existing thought-objects are editable inline

---

### T8: Axes View

**Route:** `pages/axes.tsx`

**What it does:**
1. Fetch active axes (GET `/api/axes`). Display each axis as a row: name, min label, max label, description, display order.
2. Inline edit: each row has an "Edit" affordance that expands into a form with all editable fields. PUT to `/api/axes/[id]` on save.
3. Soft delete: each row has a "Delete" button. DELETE to `/api/axes/[id]`. Remove from list on success.
4. Add axis form at the bottom: name, min label, max label, description, display order. POST to `/api/axes`. Add to list on success.
5. Navigation link back to Ingest view.

**Done when:**
- All 5 seeded axes appear on first load
- User can rename an axis and see the change persist on refresh
- User can soft-delete an axis and it disappears from the list (but row is in DB with `deleted_at` set)
- User can add a new axis and it appears in the list

---

## Success Criteria (Phase 1 Done)

These map directly to the roadmap success criteria. All four must pass before Phase 1 is complete.

1. **[SC-1] Persistence:** Run `docker compose down && docker compose up -d && npm run dev`. Previously saved fragments, thought-objects, and axes still appear in the UI.

2. **[SC-2] Ingest loop:** Paste raw text with source metadata into the Ingest view, click Save. The fragment appears in the list and its full content is visible on the Fragment view.

3. **[SC-3] Splitting:** On the Fragment view, select a passage of text. The save affordance appears. Click it. A new thought-object appears in the thought-objects list with `raw_text` matching the selection exactly (no extra trimming, no normalization).

4. **[SC-4] Axes and edit:** On the Axes view, add a new axis, rename an existing one, and delete one. On the Fragment view, edit a thought-object's text and save. All changes persist across page refresh.

---

## Constraints for Implementer

- **Never** hard-delete `worldview_axes` rows. Always set `deleted_at`.
- **Never** mutate `source_fragments.raw_text` via PUT. The API must ignore that field.
- **Never** trim interior whitespace from `thought_objects.raw_text`. Store `selection.toString()` verbatim.
- **Never** add Phase 2 columns (`metadata`, `status`, `embedding`, `worldview_coordinates`) to any table now. Phase 2 migration adds them.
- FK constraint on `thought_objects.source_fragment_id` must be enforced at the Postgres level, not just in application code.
- Use `postgres` (postgres-js) driver — not `pg` (node-postgres) — with `drizzle-orm/postgres-js`.

---

*Plan created: 2026-06-15*
*Phase: 1 — Foundation and Ingestion*
