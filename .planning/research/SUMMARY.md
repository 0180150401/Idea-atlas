# Research Summary: Idea Atlas

## Stack

Use a full-stack web app backed by Postgres and pgvector. Keep raw source text, structured metadata, embeddings, relationships, generation runs, and evaluations together in one database. Use schema-constrained LLM extraction and fixed-schema generation bundles. Start with relational edges before any dedicated graph database.

## Table Stakes

- Ingest raw notes, quotes, annotations, clippings, and personal reflections.
- Convert material into atomic thought-objects.
- Preserve source and provenance.
- Extract metadata for topic, claim type, stance, target, rhetoric, imagery, emotional valence, metaphor family, and worldview coordinates.
- Search semantically and by explicit metadata.
- Record idea relationships.
- Generate atlas-grounded aphorism bundles.
- Evaluate novelty, fidelity, depth, leakage, and usefulness.

## Differentiators

- Personal worldview coordinates guide retrieval and generation.
- Rhetorical form is modeled as data.
- Outputs preserve tension through counter-aphorisms, reversals, and hostile readings.
- A visual atlas eventually exposes clusters, outliers, and border zones.

## Watch Out For

- Do not ship a generic notes app or quote database.
- Do not let map visualization delay the first useful ingest → retrieve → generate → evaluate loop.
- Do not generate single aphorisms without provenance and interpretation.
- Do not copy distinctive source expression.
- Do not add graph infrastructure before relational edges are insufficient.

## Build Implication

The first milestone should produce a working vertical loop: manually ingest source material, structure it into thought-objects, search/retrieve a region, generate a provenance-aware bundle, and evaluate the result. The visual atlas can follow once the underlying thought-object workflow is real.
