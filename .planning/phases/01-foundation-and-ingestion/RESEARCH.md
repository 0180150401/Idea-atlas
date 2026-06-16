# Research: Phase 1 — Foundation and Ingestion

**Date:** 2026-06-15
**Phase:** 1-Foundation and Ingestion
**Status:** Complete — all major decisions locked in CONTEXT.md

> This file answers: "What does the planner need to know to implement Phase 1 well?"
> Decisions are in `01-CONTEXT.md`. This file adds verified technical specifics, integration notes, and pitfall warnings.

---

## 1. Locked Decisions (from CONTEXT.md)

These are settled. The planner must not re-open them.

| Decision | Summary |
|----------|---------|
| D-01 | Next.js Pages Router + TypeScript |
| D-02 | Drizzle ORM for schema + migrations |
| D-03 | Docker Compose with `pgvector/pgvector:pg16` from day 1 |
| D-04 | Two tables: `source_fragments` + `thought_objects` |
| D-05 | Dynamic `worldview_axes` table, soft deletion, 5 seeded defaults |
| D-06 | Text-selection UX for splitting (`mouseup` + `window.getSelection()`) |
| D-07 | Whole-fragment save also supported |
| D-08 | Source metadata: type, title, author, citation, URL, personal context |
| D-09 | Three views: Ingest, Fragment, Axes |
| D-10 | Functional UI, not polished |

---

## 2. Package Versions (verified via npm registry)

| Package | Version | Role | Confidence |
|---------|---------|------|------------|
| `next` | 16.2.9 | Full-stack framework | HIGH [VERIFIED: npm registry] |
| `drizzle-orm` | 0.45.2 | ORM + query builder | HIGH [VERIFIED: npm registry] |
| `drizzle-kit` | 0.31.10 | Migrations + schema push | HIGH [VERIFIED: npm registry] |
| `postgres` | 3.4.9 | Postgres driver (postgres-js) | HIGH [VERIFIED: npm registry] |
| `pg` | 8.21.0 | Alternate Postgres driver (node-postgres) | HIGH [VERIFIED: npm registry] |

**Driver recommendation:** Use `postgres` (postgres-js) with `drizzle-orm/postgres-js`. It has no native bindings and works cleanly in Node.js environments. [CITED: orm.drizzle.team/docs/get-started-postgresql]

**pgvector Docker image:** `pgvector/pgvector:pg16` is the correct image name. [ASSUMED — Docker daemon was not running during research; image name is the standard reference across pgvector documentation. Planner should verify on first `docker compose up`.]

---

## 3. Drizzle Setup Pattern

**Confidence: HIGH** [CITED: orm.drizzle.team/docs/get-started-postgresql]

### Installation
```
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Driver initialization (`src/db/index.ts`)
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client)
```

### drizzle.config.ts
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### npm scripts to add
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:seed": "tsx src/db/seed.ts"
```

---

## 4. Schema Design Notes

**Confidence: HIGH** [ASSUMED — derived from locked decisions in CONTEXT.md, not verified against external source]

### source_fragments
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
raw_text     text NOT NULL
source_type  text NOT NULL  -- book | article | personal | web | other
title        text
author       text
citation     text
url          text
personal_context text
created_at   timestamptz NOT NULL DEFAULT now()
```

### thought_objects
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
source_fragment_id  uuid NOT NULL REFERENCES source_fragments(id)
raw_text            text NOT NULL   -- exact excerpt, never mutated
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
```

**Phase 2 extension point:** Add `metadata JSONB`, `status text`, `worldview_coordinates JSONB` to `thought_objects` without touching `raw_text`.

### worldview_axes
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          text NOT NULL
min_label     text NOT NULL
max_label     text NOT NULL
description   text
display_order integer NOT NULL DEFAULT 0
deleted_at    timestamptz   -- soft delete only
```

**Seed data (5 defaults):**
1. agency / surrender
2. order / emergence
3. precision / mystery
4. market value / moral value
5. speed / depth

---

## 5. Text-Selection Splitting UX

**Confidence: HIGH** [ASSUMED — `window.getSelection()` is a W3C standard browser API]

### Pattern
```typescript
// On fragment view mount
document.addEventListener('mouseup', () => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return
  const text = selection.toString().trim()
  if (text.length > 0) {
    // show "Save as thought-object" affordance
    setSelectedText(text)
    setShowSaveButton(true)
  }
})
```

### Critical invariant
The saved `raw_text` must equal `selection.toString()` — **no trim, no normalization, no whitespace collapse**. Interior whitespace is part of the original wording. Only leading/trailing whitespace from accidental overshoot is acceptable to trim.

### Edge cases to handle
- User selects across element boundaries (e.g., formatted text) — `selection.toString()` still returns plain text, which is fine
- User clears selection by clicking elsewhere — hide affordance on `mouseup` with empty selection
- Mobile: `selectionchange` event instead of `mouseup` may be needed, but desktop-first for v1 [ASSUMED]

---

## 6. Docker Compose Setup

**Confidence: MEDIUM** [ASSUMED — pattern is standard; image name unverified at runtime due to Docker not available]

```yaml
# docker-compose.yml
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

```
# .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/idea_atlas
```

**Note:** `CREATE EXTENSION vector` is required before pgvector features work, but this is a Phase 2 concern. Phase 1 only needs standard Postgres tables.

---

## 7. Next.js Pages Router API Pattern

**Confidence: HIGH** [ASSUMED — well-established Next.js pattern]

For each entity, create API routes at `/pages/api/`:

```
/pages/api/fragments/index.ts    → GET (list), POST (create)
/pages/api/fragments/[id].ts     → GET (one), PUT (update)
/pages/api/thought-objects/index.ts  → POST (create)
/pages/api/thought-objects/[id].ts   → GET, PUT
/pages/api/axes/index.ts             → GET (list), POST (create)
/pages/api/axes/[id].ts              → PUT (update/rename), DELETE (soft delete)
```

Each handler follows:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') { ... }
  else if (req.method === 'GET') { ... }
  else res.status(405).end()
}
```

---

## 8. Phase 1 Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| Trimming or normalizing `raw_text` on save | Store exact `selection.toString()` — the provenance invariant is hardcoded from day 1 |
| Soft-deleting `worldview_axes` with hard delete | Use `deleted_at` — Phase 2 keys axis scores by axis ID |
| Not FK-constraining `thought_objects.source_fragment_id` | Enforce at DB level, not just app level |
| Using SQLite "temporarily" | Decision is locked: pgvector/pgvector:pg16 from day 1. SQLite→Postgres migration has zero benefit and real cost. |
| Merging Fragment view and Ingest view into one complex page | Fine to do either way, but splitting into two routes (e.g. `/ingest` and `/fragments/[id]`) keeps concerns clean |
| Adding Phase 2 metadata columns now | Don't. Leave `thought_objects` minimal. Phase 2 migration adds them. |
| Polishing UI before the loop works | D-10: functional, not polished. The three views just need to work. |

---

## 9. Open for Planner

These are left to Claude's discretion per D-10 and the discussion log:

- CSS approach: Tailwind CSS or CSS modules — both work. Tailwind is faster for functional layouts. [ASSUMED]
- Data fetching: plain `fetch` + `useState` is sufficient for Phase 1 scale. React Query / SWR is Phase 2+ territory.
- Fragment view and Ingest view: one page or two routes — either is acceptable.
- Error handling verbosity in API routes: minimal is fine for Phase 1.

---

## 10. Inter-Phase Contracts

Phase 1 establishes the schema contract that all later phases consume:

| Table | Consumed by |
|-------|------------|
| `source_fragments` | Phase 2 (metadata extraction context), Phase 4 (provenance in bundles) |
| `thought_objects` | Phase 2 (adds metadata/status/embedding columns), Phase 3 (search), Phase 4 (generation) |
| `worldview_axes` | Phase 2 (axis scoring), Phase 3 (filter by axis range), Phase 4 (generation context) |

**Hard invariant:** `thought_objects.raw_text` and `source_fragments.raw_text` must never be mutated by Phase 2+ migrations. Only additive columns are permitted.

---

*Researcher: Phase 1 research complete. Planner may proceed.*
