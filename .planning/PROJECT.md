# Idea Atlas

## What This Is

Idea Atlas is a personal literary intelligence system that turns a user's private canon into an influence graph, then uses that graph to generate original literary fragments, essays, aphorisms, and conceptual drafts with visible provenance, formal constraints, critique, and revision loops.

The product is for a serious reader-writer first: someone who wants to metabolize books, passages, marginalia, notes, and aesthetic influences into an externalized literary brain that helps them discover original voice without losing authorial agency.

## Core Value

The system must help the user transform a private canon into original literary work by preserving provenance, surfacing influence patterns, enforcing meaningful constraints, and keeping revision under the user's control.

## Current Milestone: v1.2 Auto Metadata and Generation Quality

**Goal:** Improve the automated upload-to-memory-to-generation pipeline so the system extracts better metadata, builds better tags and relationships, and generates stronger content without requiring users to fill forms or prompts.

**Target features:**
- Durable automatic processing states for uploaded material, including retryable enrichment and visible readiness.
- Typed, evidence-backed metadata and tag extraction with confidence, source snippets, and normalized literary tag families.
- Better relationship inference and generation runs that use memory/brain signals safely, with quality gates against generic output, source mimicry, false lineage, and quote leakage.

## Requirements

### Validated

- ✓ User can ingest raw notes, quotes, annotations, clipped passages, and personal reflections as atomic thought-objects — Phase 1
- ✓ User can preserve source and provenance separately from extracted metadata — Phase 1
- ✓ User can structure each thought-object with topical, rhetorical, emotional, metaphorical, and worldview metadata — Phase 2
- ✓ User can search and browse thought-objects semantically and by explicit metadata — Phase 3 and Phase 5
- ✓ User can record relationships between thought-objects, including supports, rebuts, extends, inverts, and descends-from — Phase 3
- ✓ User can generate a bundle from a selected atlas region: aphorism, counter-aphorism, gloss, reversal, hostile reading, and provenance — Phase 4
- ✓ User can evaluate generated outputs for novelty, worldview fidelity, interpretive depth, quote leakage, and usefulness — Phase 5
- ✓ User can drop media files or text into the atlas, store extracted metadata, and iterate toward new content from media plus atlas context — Studio UX milestone
- ✓ User can upload material through a minimal three-section UX and have the system automatically create memory nodes and generated content — v1.1 Phases 7-10

### Active

- [ ] User can upload material and see processing status without entering title, tags, prompts, or metadata fields.
- [ ] System can extract evidence-backed literary metadata and normalized tags with confidence and provenance.
- [ ] System can infer graph relationships from reliable metadata, embeddings, and tag evidence rather than weak similarity alone.
- [ ] System can create durable generated-content runs from generation-ready memory signals instead of page-load side effects.
- [ ] System can quality-gate generated content for quote leakage, source mimicry, false lineage, generic profundity, and tension flattening.

### Out of Scope

- Multi-user collaboration — v1 should optimize for a personal thinking environment.
- Public publishing/community features — generation quality and provenance matter before distribution.
- Native mobile apps — web/local-first workflows are enough to validate the product.
- Full Neo4j-style graph infrastructure — relational edges are enough for the first version.
- Automated ingestion from every external source — start with files/manual import before broad connector work.

## Context

The source research frames a liminal atlas as a mapped, navigable threshold between archive and invention. The closest intellectual precedents are commonplace books, Warburg-style visual atlases, semantic embedding spaces, design tokens, conceptual blending, and morphological analysis.

The basic unit is an atomic thought-object: a proposition, distinction, metaphor, warning, question, observation, counterexample, or aphorism. The atlas should not only model topic, but also rhetorical form and worldview coordinates such as agency vs. surrender, order vs. emergence, precision vs. mystery, market value vs. moral value, and speed vs. depth.

The practical architecture has four stages: ingest, structure, map, generate. A workable first version can use Postgres plus pgvector, structured extraction, embeddings, relational edge tables, a 2D projection, and a generator that produces fixed-format output bundles.

The next product direction should consolidate the current MVP into three primary sections:

1. **Living Canon** — the user's private literary memory: books, excerpts, marginalia, notes, drafts, media, personal reactions, provenance, and taste signals.
2. **Influence Atlas** — the interpretive graph: motifs, rhetorical forms, affective registers, worldview tensions, authors, works, passages, contradictions, and influence paths.
3. **Generative Workshop** — the writing studio: drafts, aphorism bundles, essay seeds, literary fragments, critique, constraints, revision handles, and provenance-aware generation.

## Constraints

- **Provenance**: Original wording must stay traceable and separate from extracted metadata — this reduces quote leakage and copyright risk.
- **Quality**: Generated output must include lineages and reversals — otherwise the system can drift into fake profundity.
- **Scope**: Single-user MVP first — collaboration, marketplace, and publishing can wait.
- **Architecture**: Use a relational edge model before adding dedicated graph infrastructure — relationships matter, but operational simplicity matters more in v1.
- **Evaluation**: Pairwise or rubric-based evaluation is required — “sounds profound” is not an acceptable success test.
- **Authorial agency**: Generation must feel like a revision partner, not an autopilot writer — the user should control canon, constraints, acceptance, rejection, and promotion back into memory.
- **Influence integrity**: The system should transform influence into original work, not imitate source style or launder distinctive phrasing.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start as a personal atlas, not a social product | The core value depends on personal worldview modeling and generation quality | — Pending |
| Model rhetorical form as first-class metadata | Aphorisms persuade through shape, cadence, symmetry, compression, and meaning | — Pending |
| Keep provenance attached to every source fragment | Needed for originality checks, lineage, and ethical reuse | — Pending |
| Use relational edges before graph infrastructure | Supports the required relationship types without premature operational complexity | — Pending |
| Generate bundles instead of single aphorisms | Bundles preserve tension and make the model show lineage, reversal, and interpretation | — Pending |
| Add Liminal Studio as the media-first ingestion and iteration surface | The atlas needs a threshold UX for dropping heterogeneous media, extracting metadata, and generating new work from the media/context tension | ✓ Good |
| Reframe v1.1 around Living Canon, Influence Atlas, and Generative Workshop | These three sections map to the real creative loop: collect, interpret, create | — Pending |
| Start v1.2 as pipeline hardening before more UX | Better generated content depends on better metadata, tags, embeddings, relationships, and quality gates | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone**:
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-16 after starting v1.2 auto metadata and generation quality milestone*
