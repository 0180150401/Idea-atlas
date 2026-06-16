# Feature Landscape: v1.2 Automatic Metadata and Generation Quality

**Milestone:** v1.2 - Improve automatic metadata, tagging, and content generation quality  
**Domain:** Serious literary memory/brain application  
**Researched:** 2026-06-16  
**Overall confidence:** MEDIUM-HIGH

## Executive Recommendation

v1.2 should make upload feel effortless while making inference feel accountable. The user should be able to drop material into the system and immediately see an intelligent memory object: title/source hints, literary form, motifs, affective register, rhetorical pattern, worldview tensions, quote-leakage sensitivity, and suggested relationships. The user should not be forced through metadata forms, but the system must expose enough confidence, evidence, and correction affordances to avoid becoming a black box.

The core product behavior should be: **upload only; inspect and correct when needed; generate only from traceable memory signals.** Serious users will trust automatic enrichment when it is grounded in source passages, uses a stable personal taxonomy, and distinguishes extracted facts from interpretive tags. They will distrust it if tags drift, relationships appear magical, or generated text pretends to be finished writing.

The current app already points in the right direction: `pages/canon.tsx` promises no metadata forms, `pages/memory.tsx` and `src/svelte/MemoryGraph.svelte` present a view-only graph, `pages/workshop.tsx` auto-generates output boxes, and `lib/atlas.ts` contains local heuristics for metadata, media prompts, and bundles. v1.2 should deepen these behaviors rather than add a generic chat layer.

## Table Stakes

Features users will expect from a serious literary memory/brain. Missing these makes the product feel toy-like or untrustworthy.

| Feature | Observable Product Behavior | Why Expected | Complexity | Notes |
|---------|-----------------------------|--------------|------------|-------|
| Zero-form ingestion | User uploads or pastes material; the item appears as a processed memory card without requiring title, author, tags, or prompt fields. | The milestone goal is upload-only operation. Manual metadata entry breaks the product promise. | Medium | Keep optional correction after processing, not before upload. |
| Processing state and retry | Each uploaded item shows status: queued, extracting text, inferring metadata, embedding, linking, generation-ready, or failed with retry. | Automatic systems need visible progress and failure handling. | Medium | Especially important for PDFs, media, and long documents. |
| Source text preservation | Original wording remains visible and separate from all inferred metadata, summaries, tags, and generated outputs. | Core project invariant; also supports citation and quote-leakage review. | Low-Medium | Never overwrite raw text with summaries. |
| Evidence-backed metadata | Each important inferred field can show “why”: source line/excerpt, filename cue, user correction history, or model confidence. | Literary users need interpretive accountability, not just labels. | Medium | Use visible evidence for author/title hints, motifs, form, affect, worldview tensions, and quote risk. |
| Stable personal tag taxonomy | The system suggests tags from a controlled, evolving vocabulary instead of inventing endless near-duplicates. | Readwise warns that auto-tagging is subjective and works best with an existing schema; PKM tools rely on consistent tags. | Medium | Tags should normalize synonyms and prefer existing user vocabulary. |
| Tag confidence tiers | Tags display as confirmed, suggested, or weak. Weak tags should not strongly affect graph layout or generation. | Avoids overtrusting low-quality inference. | Medium | Example: `motif:threshold` confirmed from repeated source language; `domain:spirituality` weak from one ambiguous cue. |
| Literary-specific metadata | Auto-extraction includes genre/form, rhetorical form, motifs/images, affective register, claim type, worldview tension, source hints, and quote-leakage sensitivity. | Generic keywords are insufficient for aphorism/literary generation. | Medium-High | Existing `inferCanonMetadata` is the seed; v1.2 needs richer, more reliable behavior. |
| Relationship suggestions | The graph shows inferred edges such as echoes, rebuts, extends, inverts, shares-image-system, shares-rhetorical-form, and descends-from. | A memory brain is defined by relationships, not isolated uploads. | High | Edges should be suggestions until confidence is high or user confirms. |
| Relationship explanations | Clicking an edge explains why it exists: shared phrase/image, opposing stance, common source, embedding similarity, rhetorical match, or user-approved lineage. | Users need to know whether an edge is semantic, formal, affective, genealogical, or speculative. | Medium-High | Avoid anonymous graph spaghetti. |
| Canon readiness gate | Items indicate whether they are raw, structured, linked, generation-ready, or excluded from generation. | Serious generation needs clean context selection. | Medium | Automatic does not mean every upload should immediately steer output. |
| Automatic generated-content refresh | Generated content updates after meaningful new memory signals, but does not flood the user with duplicates. | Current workshop auto-runs; v1.2 should make this behavior intentional and controlled. | Medium | Use debounce/batch behavior: “3 new signals changed the generated set.” |
| Provenance-visible generation | Every generated box shows source lineage, influence weights, central tension, relationship route, and what was transformed rather than copied. | Core product value and NotebookLM-like trust pattern: generated claims should be traceable to sources. | Medium-High | Existing bundle provenance should become more specific and inspectable. |
| Quality flags on generated text | Outputs are flagged for generic profundity, source mimicry, false lineage, tension flattening, unsupported claims, or quote leakage risk. | Requirements already demand literary evaluation; v1.2 should make quality visible in the generated surface. | High | This is more valuable than more output modes. |
| User correction memory | If the user edits a tag, rejects a relationship, or marks an output as generic, future inference adapts. | A personal canon must learn taste and taxonomy over time. | High | Corrections should feed retrieval/generation preferences, not disappear as UI edits. |

## Differentiators

Features that would make Idea Atlas feel like a serious literary intelligence system rather than a notes app with AI summaries.

| Feature | Observable Product Behavior | Value Proposition | Complexity | Notes |
|---------|-----------------------------|-------------------|------------|-------|
| Tension extraction | Each memory card can show a central tension: e.g. order/emergence, surrender/agency, precision/mystery, moral value/market value. | Literary work often grows from pressure between values, not from topics. | High | Use the project’s worldview-coordinate model as a first-class feature. |
| Rhetorical fingerprinting | The system tags form-level patterns: aphorism, antithesis, paradox, reversal, hostile reading, image-system, compression, parallelism. | Supports generation that transforms rhetorical energy instead of copying style. | Medium-High | More distinctive than topic tagging. |
| Image-system clustering | The graph can reveal clusters of repeated images: threshold, ruin, machine, pilgrimage, light/shadow, body, weather, archive. | Writers often discover their voice through recurring images. | Medium | Existing motif markers provide a starting vocabulary. |
| Contradiction-first graph routes | The memory graph highlights “nearest contradiction,” “distant analogue,” “unresolved tension,” and “border zone” routes. | Helps users generate from friction rather than bland similarity. | High | This extends existing v1.1 route language into observable behavior. |
| Relationship type voting by evidence | The system can propose multiple edge interpretations with evidence: “echoes because shared image,” “rebuts because stance conflict,” “extends because same target with added consequence.” | Makes inference literary and inspectable, not a single opaque similarity score. | High | Prioritize a few high-confidence suggestions over dense auto-linking. |
| Canon influence profile | The system summarizes the current canon as living signals: dominant motifs, recurring arguments, unresolved tensions, overused forms, missing counterweights. | Turns metadata into self-knowledge for a reader-writer. | Medium-High | Should be generated from confirmed/suggested metadata, not freeform analysis alone. |
| Automatic generation agenda | Instead of asking for prompts, the system decides what to generate next: one synthesis, one reversal, one hostile reading, one essay seed, one image-based fragment. | Preserves upload-only workflow while creating variety with purpose. | Medium | Current `autoGenerationModes` is a good rough shape; v1.2 should tie modes to actual graph routes. |
| Tension-bearing output bundles | Generated content appears as a bundle: aphorism, counter-aphorism, gloss, reversal, hostile reading, provenance, and quality warnings. | Prevents fake profundity and forces the system to preserve contradiction. | Medium | Already in `draftBundle`; improve selection and evidence. |
| Promotion loop | User can promote an output, critique, or revision back into memory as a generated draft node with lineage. | Makes generation part of the atlas, not disposable text. | Medium | Must preserve generated/source distinction. |
| Negative influence control | User can mark material as resisted, guilty influence, unresolved, formative, loved, or excluded, and generation changes accordingly. | Serious writers need relationships to influence, not just likes. | Medium | Already named in requirements; v1.2 should make it affect automatic generation. |
| Overfamiliarity detector | Generated content warns when it leans too much on dominant tags, motifs, or forms already overrepresented in the canon. | Helps avoid the system reinforcing the user’s easiest habits. | High | Could start as heuristic counts before richer evaluation. |

## Anti-Features

Features to explicitly avoid because they weaken authorial agency, provenance, or literary quality.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Generic AI chat box as the primary interface | It shifts the workflow back to prompting and hides the memory graph. | Keep upload, memory, and generated content as the primary loop; use prompts only as advanced controls. |
| Hidden auto-tagging with no evidence | Users cannot trust or correct bad interpretation. | Show suggested tags with confidence and evidence excerpts. |
| Unlimited freeform tag creation by the model | Produces synonym sprawl: `death`, `mortality`, `finitude`, `dying`, `memento-mori` as unrelated tags. | Normalize to a personal taxonomy with aliases and merge suggestions. |
| Treating tags as facts | Motifs, affect, and worldview tensions are interpretations, not source metadata. | Separate factual metadata, extracted textual features, and interpretive labels. |
| Dense relationship graph by similarity alone | Embedding similarity creates visually impressive but semantically vague networks. | Use typed relationships with explanations and confidence thresholds. |
| Immediate generation from every upload | Low-quality or irrelevant material can pollute generated output. | Use generation readiness, quote-risk checks, and batch refresh triggers. |
| Finished-work framing | If output appears publication-ready, the system undermines revision and authorial agency. | Label outputs as drafts, provocations, reversals, fragments, or critique seeds. |
| Named-author style imitation | High ethical and quality risk; can become pastiche or source laundering. | Generate from transformed motifs, tensions, rhetorical constraints, and provenance. |
| Summary-first ingestion | Summaries flatten literary texture and erase the phrasing, rhythm, and contradiction that matter. | Extract metadata while keeping exact source text central and inspectable. |
| Auto-publish/export loop | Premature distribution prioritizes output volume over quality and lineage. | Keep v1.2 focused on private canon, graph, generation, and evaluation. |
| Relationship certainty theater | Labels like “influenced by” or “descends from” can overclaim. | Use “suggested echo,” “possible inversion,” or “shares image-system” unless evidence is strong. |
| More output formats before better selection | Adding poems, scripts, posts, and newsletters will not fix weak memory signals. | Improve source selection, route selection, provenance, and evaluation before expanding formats. |

## Behavior by Product Surface

### Upload Material

The upload surface should stay minimal: file drop and paste remain enough. After upload, the user should see a processing card that progressively fills in inferred title, source type, extracted text status, literary form, motifs, affect, rhetorical form, worldview tensions, quote-risk status, and generation readiness.

Recommended visible states:

```text
Uploaded -> Text extracted -> Metadata inferred -> Tags normalized -> Relationships suggested -> Generation-ready
```

Each state should have a failure/retry path. If text cannot be extracted from media, the item can still be stored but should be marked as metadata-only and low-confidence for generation.

### Memory/Brain

The graph should stop being only a radial preview and become an evidence browser. Nodes should be visually differentiated by type: source, passage, motif, rhetorical form, tension, generated draft, and relationship route. Edges should carry labels and explanations. The user should be able to filter by confirmed vs suggested tags, relationship type, source type, motif, form, affect, quote risk, and generation readiness.

Most important graph behavior: relationship inference should make **few high-quality claims** rather than many weak links. A serious literary graph should feel like an argument map and influence atlas, not a decorative cluster.

### Generated Content

Generated content should appear automatically only when the memory brain has enough usable context. The generated grid should explain why each output exists:

- “Generated from a contradiction between `attention` and `power`.”
- “Uses shared image-system: `threshold`, `light/shadow`.”
- “Counterweighted by a resisted source.”
- “Quote leakage risk: low/medium/high.”
- “Weakness: may flatten the source tension into generic wisdom.”

The primary unit should remain a bundle, not a single generated line. The bundle should contain at least a draft fragment, counter-fragment, gloss, reversal, hostile reading, source lineage, and quality warnings.

## Metadata and Tagging Model

Use three visibly separate layers:

| Layer | Examples | User Trust Model |
|-------|----------|------------------|
| Factual/source metadata | file name, source type, author hint, work hint, page/chapter hint, upload date, extracted text status | Can be corrected; should be treated as factual only when evidence exists. |
| Textual/literary features | keywords, motifs, rhetoric, genre/form, affective register, imagery, claim type | Inferred from wording; show evidence snippets. |
| Interpretive atlas metadata | worldview tensions, canon relationship, influence role, generation readiness, quote-risk sensitivity | Suggested with confidence; should improve through user correction. |

Tags should be normalized into families:

- `domain:*` for topical territory: attention, power, meaning, creativity, time.
- `motif:*` for image systems: threshold, ruin, machine, light-shadow, body, pilgrimage.
- `form:*` for literary/rhetorical form: aphorism, antithesis, paradox, reversal, marginalia, essay-seed.
- `affect:*` for register: elegiac, adversarial, ecstatic, anxious, contemplative.
- `tension:*` for worldview coordinates: agency-surrender, order-emergence, precision-mystery.
- `source:*` for factual source classification: book, passage, marginalia, draft, media, quote.
- `risk:*` for quote leakage, source mimicry, weak extraction, low confidence.

## Relationship Inference Model

Relationship inference should combine multiple signals and expose the winning reason. Recommended relationship types:

| Relationship | Trigger | Evidence to Show |
|--------------|---------|------------------|
| echoes | Shared motif, phrase family, affect, or image-system | Matched images/phrases and both excerpts. |
| rebuts | Similar target but opposed stance or worldview coordinate | Conflicting claim summaries and stance labels. |
| extends | Same claim target with added consequence or broader frame | Source excerpt plus extension excerpt. |
| inverts | Same conceptual structure with reversed values | The paired tension axis and reversed terms. |
| shares-image-system | Repeated concrete imagery | Image tags and excerpts where they occur. |
| shares-rhetorical-form | Same form pattern such as paradox, antithesis, compression | Rhetorical labels and text spans. |
| descends-from | User confirms lineage or generated draft cites source lineage | Explicit user action or saved provenance. |
| parodies | Similar form plus adversarial or comic inversion | Form match plus hostile stance evidence. |
| radicalizes | Same premise pushed to more extreme conclusion | Claim summaries and intensity shift. |
| secularizes | Religious/metaphysical motif translated into worldly or procedural terms | Motif transformation evidence. |

Do not show inferred edges as equally certain. Use states:

- `suggested`: model/system found a plausible relationship.
- `confirmed`: user accepted it or repeated evidence is strong.
- `rejected`: user dismissed it; future inference should avoid similar edges.
- `derived`: generated content or user draft explicitly created a lineage edge.

## Generated-Content Behavior

Generation should be automatic, but not indiscriminate. Recommended trigger rules:

| Trigger | Behavior |
|---------|----------|
| New upload with high-confidence metadata | Create or refresh one small set of generated drafts tied to the new material. |
| New relationship cluster | Generate a synthesis/reversal bundle from that relationship route. |
| New contradiction | Generate a hostile reading or counter-aphorism bundle. |
| User correction to tags/relationships | Refresh only affected outputs and explain what changed. |
| Low confidence or high quote risk | Do not auto-generate; show “needs review before generation.” |

Generated boxes should include:

- Output mode and formal constraint.
- Source route: selected nodes, relationships, and tags.
- Central tension.
- Provenance excerpts.
- Transformation note: what changed from source to output.
- Quality flags.
- Promotion/reject controls.

## Feature Dependencies

```text
Text extraction -> Source preservation -> Metadata extraction -> Tag normalization
Tag normalization -> Relationship inference -> Graph routes -> Automatic generation agenda
Relationship inference -> Provenance-visible generation -> Quality flags
User corrections -> Taxonomy learning -> Better future metadata and generation
Quote-risk detection -> Generation readiness -> Safer generated content
```

## MVP Recommendation

Prioritize:

1. **Inspectable auto-metadata cards**: after upload, show inferred factual, literary, and interpretive fields with confidence and evidence.
2. **Controlled tag families**: normalize tags into domain, motif, form, affect, tension, source, and risk families.
3. **Typed relationship suggestions**: infer a small number of explained edges and expose suggested/confirmed/rejected states.
4. **Generation readiness gate**: prevent weak or risky material from silently steering output.
5. **Provenance-rich generated bundles**: generated boxes should show route, tension, lineage, transformation note, and quality warnings.

Defer:

- Full multi-modal understanding for image/audio/video content: store and classify media now, but do not pretend to deeply interpret it without robust extraction.
- Broad connector ecosystem: Readwise/Zotero/Kindle imports can wait; uploaded files and pasted text are enough for v1.2.
- Advanced graph layout algorithms: typed, explained relationships matter more than beautiful layout.
- Many new generated formats: improve selection and critique before expanding output modes.
- Fully automatic taxonomy rewrites: suggest merges and aliases, but do not silently reorganize the user’s canon.

## Sources

- Project context and invariants: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` - HIGH confidence.
- Current product surfaces: `pages/canon.tsx`, `pages/memory.tsx`, `src/svelte/MemoryGraph.svelte`, `pages/workshop.tsx`, `lib/atlas.ts` - HIGH confidence.
- Readwise Reader Ghostreader docs: automatic summarization/tagging exists, auto-tagging is experimental and benefits from explicit taxonomy prompts - MEDIUM-HIGH confidence. <https://docs.readwise.io/reader/docs/faqs/ghostreader>
- Readwise Ghostreader prompt customization: auto-tagging should output constrained tags and use existing schema/context - MEDIUM-HIGH confidence. <https://docs.readwise.io/reader/guides/ghostreader/custom-prompts>
- Google NotebookLM help/product docs: source-grounded responses with citations are a trust pattern for serious research tools - MEDIUM confidence. <https://support.google.com/notebooklm/answer/16164461>
- Obsidian help: properties, tags, backlinks, and graph filtering are table-stakes PKM behaviors - MEDIUM-HIGH confidence. <https://obsidian.md/help/tags>, <https://obsidian.md/help/plugins/graph>, <https://obsidian.md/help/link-notes>
- Heptabase public materials: cards, tags/properties, backlinks, whiteboards, and source/citation-oriented AI are relevant adjacent behavior patterns - MEDIUM confidence. <https://heptabase.com/>, <https://wiki.heptabase.com/fundamental-elements>

## Open Questions

- How much user correction UI is acceptable before it violates the “upload only” product promise?
- Should high-confidence relationships be auto-confirmed, or should all interpretive edges begin as suggestions?
- What is the minimum viable quote-leakage detector for v1.2: exact substring overlap, fuzzy phrase overlap, or model-assisted risk scoring?
- Should generated content refresh automatically on every qualifying upload, or should the page show a “memory changed; refresh generated set” state to preserve user control?
