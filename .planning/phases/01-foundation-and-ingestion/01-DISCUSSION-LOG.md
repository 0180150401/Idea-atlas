# Phase 1: Foundation and Ingestion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 1-Foundation and Ingestion
**Mode:** Self-discuss (autonomous — no human present)
**Areas discussed:** Framework, Data Model, Worldview Axes, Splitting UX, Local DB Setup

---

## Framework

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js App Router | RSC, server components, streaming — modern but high ceremony | |
| Next.js Pages Router | API routes at /api/*, familiar, minimal magic | ✓ |
| Vite + React + Express | Max control, manual routing and API wiring | |
| Remix | Excellent loader/action pattern, steeper initial mental model | |

**Selected:** Next.js Pages Router with TypeScript
**Notes:** Research explicitly names Next.js. Pages Router avoids App Router ceremony while providing everything needed for Phase 1. Drizzle ORM chosen for type-safe migrations.

---

## Data Model (source_fragments vs. thought_objects)

| Option | Description | Selected |
|--------|-------------|----------|
| Single table with status column | thought_objects with raw_text + nullable metadata_json + status | |
| Two tables | source_fragments → thought_objects with FK | ✓ |
| Self-referential parent_id | Single table with parent_id for hierarchy | |

**Selected:** Two tables
**Notes:** The two-table model enforces the provenance hard invariant at the schema level. Raw wording in source_fragments is never mutated. Every thought-object traces to its source fragment via FK. Phase 2 structuring adds metadata to thought_objects without touching the raw text column.

---

## Worldview Axes Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Static enum in code | Hard-coded defaults, user can rename but not add | |
| Dynamic worldview_axes table | Full CRUD with soft deletion | ✓ |
| JSON blob in settings table | Simple but no referential integrity | |

**Selected:** Dynamic worldview_axes table
**Notes:** FOUN-03 requires users to define and edit axes. The table model gives referential integrity for when Phase 2 stores axis scores keyed by axis ID. Soft deletion (deleted_at) preserves historical data. Seeded with 5 defaults: agency/surrender, order/emergence, precision/mystery, market-value/moral-value, speed/depth.

---

## Splitting UX

| Option | Description | Selected |
|--------|-------------|----------|
| Text-selection UX | mouseup + getSelection() → "Save as thought-object" | ✓ |
| Manual form entry | User types/pastes the excerpt explicitly | |
| Auto-split on paragraph breaks | Heuristic splitting with confirm UI | |

**Selected:** Text-selection UX
**Notes:** Most natural interaction for reading-and-marking. Preserves exact wording character-for-character (provenance invariant). Entire-fragment save also supported for cases where no splitting is needed. Auto-split heuristics deferred — may revisit if selection proves insufficient.

---

## Local Database Setup

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite for Phase 1, migrate in Phase 2 | Zero setup, but hard migration break | |
| System Postgres + add pgvector in Phase 2 | Assumes local Postgres install | |
| Docker Compose with pgvector/pgvector:pg16 | One command setup, no Phase 2 migration risk | ✓ |

**Selected:** Docker Compose with pgvector/pgvector:pg16 from day 1
**Notes:** SQLite→Postgres migration in Phase 2 has zero benefit and real risk. Docker setup is trivial and permanent. Phase 2's CREATE EXTENSION vector becomes a one-line migration. DATABASE_URL in .env.local.

---

## Claude's Discretion

- Exact CSS approach (Tailwind vs. CSS modules) — both viable for functional Phase 1 UI
- Whether Fragment view and Ingest view are one page or two routes
- Error handling verbosity in API routes
- Client-side data fetching library (React Query vs. SWR vs. plain fetch)
- UI polish level (D-10 specifies functional-not-polished, exact aesthetic is builder's call)

## Deferred Ideas

- Bulk markdown import (IMPT-01) — v2, start with paste-based ingestion
- Embedding generation — Phase 2
- Semantic search — Phase 3
- Relationship edges — Phase 3 (RETR-04)
- Visual atlas / cluster browser — Phase 5
- Auto-split on paragraph breaks — may revisit after Phase 1 UX is validated
