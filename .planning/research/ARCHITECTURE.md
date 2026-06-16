# Architecture Research: Idea Atlas

## Component Boundaries

### Ingestion

Accepts source material and stores raw text with source type, provenance, and user-supplied context. It should not discard original wording.

### Structuring

Transforms raw fragments into thought-object records with fixed metadata fields. Extraction should be schema-constrained and reviewable by the user.

### Storage

Persists raw fragments, structured metadata, embeddings, relationships, projection coordinates, generation runs, and evaluation records in Postgres.

### Retrieval

Combines semantic similarity, explicit metadata filters, worldview-axis constraints, and relationship traversal.

### Mapping

Projects embeddings into 2D coordinates, detects clusters and outliers, and exposes atlas regions for browsing and generation.

### Generation

Starts from a selected region or query, retrieves near neighbors plus adjacent/distant material, and returns a fixed bundle with provenance.

### Evaluation

Records rubric scores, pairwise comparisons, quote-leakage checks, and user feedback for generated bundles.

## Data Flow

1. User imports or writes raw material.
2. System stores raw material and provenance.
3. Structuring step creates thought-object metadata.
4. Embedding step stores vectors for thought objects.
5. Relationship step records explicit edges.
6. Mapping step computes or refreshes coordinates and clusters.
7. User selects an atlas region or query.
8. Retrieval gathers nearby, adjacent, and contrasting thought objects.
9. Generation produces a structured bundle.
10. Evaluation stores feedback and originality checks.

## Suggested Build Order

1. Define schema and local project foundation.
2. Build manual ingestion and thought-object CRUD.
3. Add structured extraction and embeddings.
4. Add semantic search and metadata filtering.
5. Add relationship edges and provenance views.
6. Add generation bundles.
7. Add evaluation records and leakage checks.
8. Add 2D atlas visualization.

## Integration Notes

The first usable loop should not wait for the visual map. A text-first atlas region flow can validate ingestion, retrieval, generation, and provenance before projection is polished.
