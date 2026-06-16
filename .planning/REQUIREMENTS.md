# Requirements: Idea Atlas v1.2 Auto Metadata and Generation Quality

**Defined:** 2026-06-16
**Core Value:** The system must help the user transform uploaded material into original literary work by automatically building a trustworthy memory/brain and generating content from evidence-backed signals.

## v1.2 Requirements

Requirements for the next milestone. Each maps to roadmap phases.

### Processing State

- [x] **PROC-01**: User can upload or paste material without entering title, author, tags, prompts, or metadata fields.
- [x] **PROC-02**: System stores uploaded material immediately and tracks processing states: queued, running, succeeded, failed, skipped, and generation-ready.
- [x] **PROC-03**: System can retry failed processing work without duplicating source fragments, thought objects, tags, relationships, or generation outputs.
- [x] **PROC-04**: User can see whether material is still processing, ready for the memory graph, ready for generation, or blocked by extraction quality.

### AI Schemas and Embeddings

- [x] **SCHEMA-01**: System validates model-derived metadata, tags, relationships, and generation plans with typed schemas before persisting them.
- [x] **SCHEMA-02**: System records model/provider/schema version and extraction method for each AI-derived enrichment.
- [x] **SCHEMA-03**: System replaces or supplements hash-based 8-dimensional embeddings with real semantic embeddings suitable for literary retrieval.
- [x] **SCHEMA-04**: System can backfill embeddings and enrichment for existing memory objects safely and idempotently.

### Metadata and Tag Taxonomy

- [x] **META-01**: System extracts literary metadata with evidence and confidence, including source hints, genre/form, motifs, rhetoric, affect, worldview tension, provenance, and quote-leakage sensitivity.
- [x] **META-02**: System separates factual metadata, textual/literary features, and interpretive atlas metadata so inferred interpretation is not treated as source truth.
- [x] **META-03**: System normalizes tags into stable families: domain, motif, form, affect, worldview, source, and risk.
- [x] **META-04**: System stores tag assignments with confidence, source, evidence snippets, and lifecycle state such as suggested, confirmed, weak, rejected, or corrected.
- [x] **META-05**: System determines generation readiness from metadata quality, extraction confidence, quote risk, and source sufficiency.

### Relationship Inference

- [x] **REL-01**: System suggests typed relationships between memory nodes using embeddings, tags, metadata, and textual evidence.
- [x] **REL-02**: System supports literary relationship types including echoes, rebuts, extends, inverts, parodies, radicalizes, secularizes, shares-image-system, and shares-rhetorical-form.
- [x] **REL-03**: System stores relationship confidence, evidence, inference source, and lifecycle state separately from accepted relationships.
- [x] **REL-04**: Memory/Brain graph can show relationship evidence and distinguish suggested, confirmed, rejected, and derived edges.

### Durable Generation Runs

- [x] **GENRUN-01**: System creates durable generation runs instead of generating new content as a side effect of opening the generated-content page.
- [x] **GENRUN-02**: System snapshots the memory context, route strategy, selected tags, source lineage, quality thresholds, and output plan for each generation run.
- [x] **GENRUN-03**: Generated Content loads the latest completed generation run as a grid of text boxes.
- [x] **GENRUN-04**: System can refresh or regenerate the generated grid from generation-ready memory signals without requiring a prompt or manual configuration.
- [x] **GENRUN-05**: Each generated text box shows source route, influence weights, central tension, transformation note, and quality warnings.

### Quality Gates

- [x] **QUAL-01**: System automatically checks generated content for quote leakage, source mimicry, false lineage, generic profundity, tension flattening, and provenance coverage.
- [x] **QUAL-02**: System prevents high-risk generated content from appearing as passed output unless it is explicitly flagged.
- [x] **QUAL-03**: System feeds rejection, quality flags, and accepted outputs back into future context selection and generation guidance.
- [x] **QUAL-04**: System preserves generated/source distinction so generated drafts do not contaminate the memory graph without lineage and acceptance state.

## Deferred

Tracked but not required for v1.2.

- **OCR-01**: Full OCR over arbitrary images and scanned PDFs.
- **CONNECT-01**: Readwise, Kindle, Zotero, Apple Books, browser-highlight, or external-library connectors.
- **GRAPHDB-01**: Dedicated graph database or separate vector database.
- **CHAT-01**: Generic chat interface for prompting the memory/brain.
- **PUBLISH-01**: Publishing, export portfolio, or public distribution workflows.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Required metadata forms | The product direction is upload-only automation |
| Silent auto-tagging without evidence | Bad inferred tags would corrupt memory, graph, and generation |
| Dense similarity-only graph edges | Literary relationships need typed evidence, not decorative graph density |
| Automatic generation from low-confidence material | Weak metadata should not drive generated content |
| Named-author style imitation | High ethical and quality risk; generation should transform influence, not mimic style |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROC-01 | Phase 11 | Complete |
| PROC-02 | Phase 11 | Complete |
| PROC-03 | Phase 11 | Complete |
| PROC-04 | Phase 11 | Complete |
| SCHEMA-01 | Phase 12 | Complete |
| SCHEMA-02 | Phase 12 | Complete |
| SCHEMA-03 | Phase 12 | Complete |
| SCHEMA-04 | Phase 12 | Complete |
| META-01 | Phase 13 | Complete |
| META-02 | Phase 13 | Complete |
| META-03 | Phase 13 | Complete |
| META-04 | Phase 13 | Complete |
| META-05 | Phase 13 | Complete |
| REL-01 | Phase 14 | Complete |
| REL-02 | Phase 14 | Complete |
| REL-03 | Phase 14 | Complete |
| REL-04 | Phase 14 | Complete |
| GENRUN-01 | Phase 15 | Complete |
| GENRUN-02 | Phase 15 | Complete |
| GENRUN-03 | Phase 15 | Complete |
| GENRUN-04 | Phase 15 | Complete |
| GENRUN-05 | Phase 15 | Complete |
| QUAL-01 | Phase 16 | Complete |
| QUAL-02 | Phase 16 | Complete |
| QUAL-03 | Phase 16 | Complete |
| QUAL-04 | Phase 16 | Complete |

**Coverage:**

- v1.2 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-16*
