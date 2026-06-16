# Phase 11: Processing State Foundation - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous discuss)

<domain>
## Phase Boundary

Make upload and enrichment durable, visible, retryable, and generation-readiness aware without requiring user metadata forms.
</domain>

<decisions>
## Implementation Decisions

- Postgres-backed `processing_jobs` table with idempotency keys
- Synchronous job drain after upload (no external queue in v1.2)
- Processing states on source fragments, thought objects, and media items
- Upload UI polls and displays job progress
</decisions>
