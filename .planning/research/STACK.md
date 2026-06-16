# Stack Research: Idea Atlas

## Recommendation

Build the first version as a web application with a Postgres-backed knowledge store, vector search, structured extraction, and a lightweight graph edge model.

## Standard Stack

- **Application**: Next.js or another full-stack React framework for rapid iteration on ingestion, browsing, map views, and generation flows.
- **Database**: Postgres as the system of record.
- **Vector Search**: pgvector so embeddings live next to source text, metadata, and relationships.
- **Structured Extraction**: LLM structured outputs constrained by JSON Schema for consistent thought-object records.
- **Embeddings**: Hosted embeddings for fastest v1; keep a path open for local Sentence Transformers later.
- **Relationship Model**: Relational `edges` table before dedicated graph infrastructure.
- **Visualization**: 2D projection pipeline using UMAP-style coordinates and cluster labels; the first UI can consume persisted coordinates rather than computing them live.
- **Generation**: Fixed-schema output bundles with aphorism, counter-aphorism, gloss, reversal, hostile reading, and provenance.
- **Evaluation**: Rubric and pairwise comparison records stored in the database.

## What Not To Use First

- **Neo4j as a v1 dependency**: Useful later, but relational edges cover the needed relationship verbs initially.
- **A generic notes app architecture**: The differentiator is structured intellectual metadata and worldview-guided generation, not basic note CRUD.
- **Single-shot generation prompts**: The system should retrieve from atlas regions and produce auditable bundles.
- **Untracked source snippets**: Provenance is a product requirement, not a nice-to-have.

## Confidence

High confidence for Postgres plus pgvector, structured extraction, relational edges, and fixed-schema generation. Medium confidence for the exact UI framework until the codebase is bootstrapped.
