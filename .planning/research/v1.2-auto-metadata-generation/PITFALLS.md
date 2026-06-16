# Domain Pitfalls: v1.2 Automatic Metadata and Generation Quality

**Domain:** Literary memory app with automatic metadata extraction, tagging, relationship inference, and generated writing
**Milestone:** v1.2 Improve automatic metadata, tagging, and content generation quality
**Researched:** 2026-06-16
**Overall confidence:** HIGH for project-specific risks; MEDIUM for external ecosystem patterns

## Executive Summary

The central v1.2 risk is not that automatic metadata fails visibly. It is that it works just well enough to populate the atlas with plausible but unstable labels, then those labels become retrieval signals, graph edges, and generation context. In a literary memory app, weak metadata does more than reduce search quality: it corrupts the user's model of influence and pushes generated writing toward generic profundity, false lineage, or source mimicry.

The user explicitly does not want required UX where people fill in information. That means v1.2 should not solve quality by adding forms. It should solve quality by adding confidence, constrained vocabularies, passive corrections, conservative promotion gates, audit views, and evaluation feedback loops.

The current code is intentionally heuristic: keyword domains, marker-based motifs/rhetoric, 8-dimensional hash embeddings, auto-generated prompts, fallback generation from recent thoughts, and provenance strings that assert transformation rather than measure it. v1.2 should treat these as scaffolding. The next roadmap work should harden the pipeline before letting inferred metadata drive graph structure or automated generation at higher volume.

## Critical Pitfalls

### Pitfall 1: Treating Inferred Tags as Ground Truth

**What goes wrong:** Automatically inferred domains, motifs, rhetoric, affective registers, and genre forms are written as if they are facts. The atlas then uses these labels for filtering, graph grouping, and generation context, so one weak extraction contaminates multiple downstream surfaces.

**Why it happens:** The current `inferCanonMetadata` and `extractMetadata` functions return flat values without confidence, extraction method, ambiguity, or competing candidates. The schema stores `inferredMetadata` but does not distinguish high-confidence labels from guesses.

**Consequences:**
- Bad graph clusters look authoritative.
- Generation receives noisy context and produces generic or misplaced work.
- The user loses trust because the app appears to misunderstand their canon.
- Later cleanup becomes expensive because downstream bundles and relationships were built on bad labels.

**Prevention:**
- Store every inferred field with `value`, `confidence`, `method`, and `evidenceSpan` where possible.
- Use constrained canonical vocabularies for stable fields such as `domains`, `rhetoric`, `affectiveRegister`, `genreForm`, and relation `type`.
- Allow low-confidence terms to exist as "candidate signals" but keep them out of graph edges and generation prompts until validated by repeated evidence or user behavior.
- Prefer passive correction UX: dismiss tag, pin tag, merge tag, "not this", "more like this", and promotion/rejection signals instead of required metadata forms.

**Detection:**
- Many items fall into `general`, `other`, or broad domains.
- Tags explode into near-duplicates.
- Generation outputs repeat the same abstract vocabulary regardless of source material.
- User repeatedly rejects generated outputs from certain tag families.

**Roadmap phase:** Phase 7, Living Canon. This must be addressed before Phase 8 uses metadata as graph structure.

### Pitfall 2: Free-Text Tag Drift

**What goes wrong:** The system silently creates or preserves uncontrolled tags such as motifs, keywords, domains, and rhetorical forms. Over time, `light`, `visibility`, `illumination`, `seeing`, and `radiance` become separate signals even when the atlas should treat them as related or synonymic.

**Why it happens:** Automatic tagging systems tend to over-generate. The current app extracts keywords directly from token order and motifs from a small marker map. There is no canonical tag registry, synonym map, deprecation policy, or merge path.

**Consequences:**
- Search facets become noisy.
- Graph neighborhoods fragment.
- Similar fragments fail to meet each other.
- Generation receives shallow keyword lists rather than stable literary coordinates.

**Prevention:**
- Create a canonical vocabulary layer with stable IDs, labels, synonyms, definitions, and examples.
- Map raw extracted phrases to canonical IDs before they affect search, graph, or generation.
- Keep "emerging concepts" separate from approved tags and surface them in an audit queue.
- Add scheduled metadata audits: unused tags, overlapping tags, over-broad tags, and tags with high rejection rates.

**Detection:**
- High ratio of unique tags to fragments.
- Many one-off keywords become graph-visible.
- Same source family appears under multiple names.
- Generated outputs use tags as decorative nouns rather than interpretive pressure.

**Roadmap phase:** Phase 7, Living Canon, with continued stewardship in Phase 8.

### Pitfall 3: Inferring Literary Relationships from Weak Similarity

**What goes wrong:** The app labels relationships such as `rebuts`, `extends`, `inverts`, `echoes`, or `descends-from` based on tag overlap or embedding proximity. Literary relationship types are interpretive claims, not just similarity scores.

**Why it happens:** Relationship inference is tempting once metadata and embeddings exist. The current schema supports relationship rows but only the early v1 types are represented. v1.1 requirements call for richer literary relationships, increasing pressure to automate them.

**Consequences:**
- The Influence Atlas becomes a fake map of influence rather than a useful interpretive graph.
- "Descends-from" or "echoes" can imply false lineage.
- Generation may claim a source transformed another source without evidence.
- The user's creative route selection becomes misleading.

**Prevention:**
- Separate similarity edges from interpretive relationship edges.
- Require relation-specific evidence: shared image system for `shares-image-system`, explicit opposition for `rebuts`, structural reversal for `inverts`, historical/source evidence for `descends-from`.
- Store relation confidence and rationale, not just `type`.
- Use conservative labels such as `candidate-echo` or `nearby-signal` until evidence is strong.
- Never infer provenance or influence lineage from embedding similarity alone.

**Detection:**
- Many edges have the same type.
- Edge explanations are generic or interchangeable.
- The graph links fragments with shared vocabulary but opposite rhetorical function.
- Generation provenance overstates "lineage" from merely adjacent items.

**Roadmap phase:** Phase 8, Influence Atlas. This phase should own relationship validation and graph semantics.

### Pitfall 4: Letting Bad Metadata Enter Generation Context Automatically

**What goes wrong:** The generator receives automatically inferred tags, motifs, and context without quality gates. It then produces text that reflects extraction artifacts rather than the user's actual canon.

**Why it happens:** The current workshop automatically generates a grid on page load and `/api/generate` falls back to the eight most recent thought objects when no context is selected. This matches the no-form UX goal, but it risks generating from accidental, low-quality, or unrelated memory.

**Consequences:**
- Generated outputs feel random or generic.
- Recent uploads dominate over meaningful canon.
- Weak metadata becomes amplified into visible writing.
- The user cannot tell whether a bad output came from bad source material, bad retrieval, or bad generation.

**Prevention:**
- Build an automatic context assembler that ranks by promoted canon status, metadata confidence, source diversity, evaluation history, and topical coherence.
- Do not use raw recency as the main fallback once v1.2 quality work begins.
- Add context sufficiency checks before generation: enough source material, enough contrast, enough provenance, and enough non-generic signals.
- Show "memory signals used" with confidence and allow one-click removal after generation, not required pre-generation forms.

**Detection:**
- Regenerating produces many near-identical bundles.
- Outputs are driven by the most recent upload even when unrelated to the user's canon.
- Provenance lists sources but the generated claim cannot be traced to them.
- User refreshes the grid repeatedly without promoting outputs.

**Roadmap phase:** Phase 9, Generative Workshop, with input quality gates from Phase 7 and Phase 8.

### Pitfall 5: Confusing Provenance Display with Grounding

**What goes wrong:** Every generated bundle shows source excerpts and a `transformedRatherThanCopied` note, but the app does not verify that the generated text is actually grounded in those sources or that the transformation claim is true.

**Why it happens:** Provenance is currently attached at bundle level from selected thoughts. That proves the source was included in context, not that each generated claim, image, or phrase was supported by it.

**Consequences:**
- False lineage becomes part of the artifact.
- The user may trust invented influence explanations.
- Quote leakage or source mimicry can hide behind a provenance panel.
- Evaluation cannot identify whether failure came from retrieval, context assembly, or generation.

**Prevention:**
- Move from bundle-level provenance to claim-level or section-level grounding.
- For each output section, store which source IDs influenced it and what was transformed: image, stance, tension, rhetorical form, or concept.
- Add a groundedness check that flags unsupported claims and overly generic lineage.
- Label provenance conservatively: "used as context" unless transformation evidence exists.

**Detection:**
- Provenance text is identical across bundles.
- Source excerpts are listed but no generated phrase or idea clearly maps to them.
- Evaluation flags `falseLineageRisk` or `intertextualIntegrity` problems.
- Outputs claim a "central tension" that does not appear in the source set.

**Roadmap phase:** Phase 9, Generative Workshop, and Phase 10, Literary Evaluation Loop.

### Pitfall 6: Quote Leakage and Source Mimicry Hidden by Automatic Generation

**What goes wrong:** Generated content copies distinctive phrases, paraphrases too closely, imitates a source's style, or borrows an idea without enough transformation. The risk is higher when the app uses long excerpts, quotes, marginalia, and source-like prompts.

**Why it happens:** The current quote-leak detector only flags long quoted spans in source text. It does not compare generated outputs against source excerpts, detect close paraphrase, or distinguish "influenced by" from "written like."

**Consequences:**
- The app undermines its core promise of original literary work.
- Generated outputs may be plagiaristic, source-mimicking, or ethically unusable.
- The user may internalize borrowed phrasing as their own draft.

**Prevention:**
- Add output-to-source similarity checks: exact n-gram overlap, distinctive phrase overlap, and semantic paraphrase risk.
- Penalize generation that preserves named-source style, cadence, or unusual phrasing.
- Prefer transformations across tension, image, and argument rather than continuation of a single source voice.
- Keep living authors and distinctive contemporary styles out of explicit imitation modes.
- Require generation bundles to include reversal, critique, and transformed signal fields because tension reduces straight mimicry.

**Detection:**
- Generated text contains source-specific phrases longer than a short threshold.
- Output uses the same image system and rhetorical cadence as one source without critique or reversal.
- `quoteLeakageRisk` or `sourceMimicryRisk` evaluations stay high.
- User feels the output is "too much like" a source rather than a new synthesis.

**Roadmap phase:** Phase 10, Literary Evaluation Loop, with generation constraints in Phase 9.

### Pitfall 7: Generic Profundity from Over-Abstract Metadata

**What goes wrong:** The generator produces polished but interchangeable lines about maps, thresholds, shadows, memory, depth, and tension. It sounds aligned with the product's vocabulary but not with the actual source material.

**Why it happens:** Current metadata and prompt construction favor broad domains and keywords. The sample generation template uses recurring atlas/threshold language. Without image precision and source-specific constraints, automatic generation will optimize for product-flavored eloquence.

**Consequences:**
- Outputs feel impressive once and hollow thereafter.
- The user's distinctive canon gets flattened into the app's house style.
- Evaluation becomes hard because generic outputs often sound superficially good.

**Prevention:**
- Require concrete source signals in every generation context: image, sentence shape, contradiction, affect, and provenance.
- Add "banned generic vocabulary" or downweight repeated product terms unless they appear in the source.
- Score image precision and novelty against the current user's prior generated outputs.
- Force each bundle to name the exact tension it preserves, not just "hidden tension."
- Use evaluation feedback to reduce repeated structures and phrases.

**Detection:**
- Multiple bundles share the same nouns and sentence skeletons.
- Output remains plausible after swapping source provenance.
- High rhetorical polish but low `imagePrecision`, `transformativeOriginality`, or `revisionUsefulness`.

**Roadmap phase:** Phase 9, Generative Workshop, and Phase 10, Literary Evaluation Loop.

### Pitfall 8: Evaluation Happens Too Late to Protect the Atlas

**What goes wrong:** The system evaluates generated outputs after they are created, but bad metadata, weak graph edges, and poor context selection have already shaped them. Evaluation becomes a scorecard rather than a control system.

**Why it happens:** Current evaluation fields are strong and project-specific, but they live on bundles. There is no equivalent quality signal on metadata fields, relationships, generation contexts, or source promotion.

**Consequences:**
- The app can repeatedly generate from known-bad signals.
- Rejected outputs do not teach retrieval or metadata extraction.
- The user has to absorb quality failures instead of the system preventing them.

**Prevention:**
- Feed evaluation results backward into metadata confidence, context ranking, and generation constraints.
- Track failure attribution: metadata failure, relation failure, retrieval failure, prompt failure, or generation failure.
- Add automatic suppression rules for sources, tags, or relation types that repeatedly lead to bad outputs.
- Use pairwise comparisons to learn preferences without asking the user to fill metadata fields.

**Detection:**
- Same failure mode appears across many bundles.
- Evaluation guidance is generic and not tied to retrieval or metadata decisions.
- Bad outputs continue to use the same source clusters or tags.

**Roadmap phase:** Phase 10, Literary Evaluation Loop. Some instrumentation must begin in Phase 7.

### Pitfall 9: Canon Contamination from Generated Outputs

**What goes wrong:** Generated drafts are promoted back into memory without preserving that they are generated artifacts. Future generations then retrieve them as if they were source material, causing self-referential drift.

**Why it happens:** The roadmap wants promotion back into the canon, and the schema separates `generationBundles` from source fragments. But if generated material becomes a thought object without strong lineage metadata, the atlas can confuse original source material, user writing, and machine-generated drafts.

**Consequences:**
- The system starts imitating its own previous outputs.
- Generic phrasing compounds over time.
- Provenance chains become muddy.
- The user's private canon is polluted by unaccepted machine language.

**Prevention:**
- Preserve artifact type: source fragment, user note, marginalia, generated draft, revised draft, accepted user work.
- Require generated outputs promoted to memory to keep full lineage: source IDs, generation ID, evaluation scores, revision history, and user acceptance status.
- Exclude unaccepted generated drafts from default retrieval and graph inference.
- Give user-authored revisions higher trust than raw generated text.

**Detection:**
- New outputs cite earlier generated bundles more often than source fragments.
- Generated phrasing repeats across sessions.
- Provenance chains contain generated drafts without user revision markers.

**Roadmap phase:** Phase 9, Generative Workshop, and Phase 10, Literary Evaluation Loop.

### Pitfall 10: Solving "No Forms" by Removing Agency

**What goes wrong:** To avoid asking the user to fill metadata, the app makes too many silent decisions: what is canon, what matters, what relates, and what should be generated.

**Why it happens:** Minimal-input UX can be mistaken for fully automatic authorial flow. But the project's stated invariant is authorial agency: generation should be a revision partner, not an autopilot writer.

**Consequences:**
- The user feels the atlas is writing over them.
- Incorrect inferences are hard to correct.
- The app optimizes for activity rather than quality.
- The Living Canon becomes less personal even as it becomes more automated.

**Prevention:**
- Replace required forms with lightweight agency controls: promote, demote, pin, hide, merge, reject, "use less", "use more", "not my meaning", and "this is central."
- Make automatic decisions inspectable after the fact.
- Default to conservative use of inferred metadata until user behavior confirms it.
- Treat accepted/rejected outputs as the primary feedback channel.

**Detection:**
- User has no way to correct a wrong tag or relation without editing structured data.
- Generated content appears before enough canon quality exists.
- The product feels busy but not more personally accurate.

**Roadmap phase:** Phase 7, Living Canon, and Phase 9, Generative Workshop.

## Moderate Pitfalls

### Pitfall 11: Metadata Extracted from File Names Instead of Meaning

**What goes wrong:** Media or document metadata is inferred from file name, MIME type, or first line when text extraction is absent or weak. This can produce misleading titles, domains, and prompts.

**Prevention:** Store extraction mode and confidence; keep file-name-only metadata out of graph edges and generation unless no better context exists; make "needs text extraction" visible as a passive quality state.

**Roadmap phase:** Phase 7, Living Canon.

### Pitfall 12: Overweighting the First Fragment

**What goes wrong:** `draftBundle` treats the first thought as primary and the second as contrast. If ordering is arbitrary, generation inherits accidental hierarchy.

**Prevention:** Context assembly should explicitly choose primary, contrast, distant analogue, and counterpressure roles based on graph route and metadata confidence.

**Roadmap phase:** Phase 9, Generative Workshop.

### Pitfall 13: Using Toy Embeddings as Real Semantics

**What goes wrong:** The current 8-dimensional hash embedding is useful for an MVP but not enough for literary similarity, influence, or contradiction.

**Prevention:** Before v1.2 relationship inference, replace or supplement toy embeddings with real semantic embeddings and keep rhetorical/form metadata separate from semantic proximity.

**Roadmap phase:** Phase 8, Influence Atlas.

### Pitfall 14: Relationship Type Schema Lags Product Vocabulary

**What goes wrong:** The schema comment lists early relationship types while requirements include richer literary relationships such as `echoes`, `parodies`, `radicalizes`, `secularizes`, and `shares-image-system`.

**Prevention:** Define a canonical relation registry before auto-inference; include relation definitions, examples, required evidence, and allowed directionality.

**Roadmap phase:** Phase 8, Influence Atlas.

### Pitfall 15: Evaluation Metrics Become Generic Ratings

**What goes wrong:** The app has strong evaluation dimensions, but if they are presented as generic 1-5 scores without exemplars or failure examples, they will not reliably guide future generation.

**Prevention:** Attach each score to short failure tags and optional passive notes; derive generation guidance from specific low/high dimensions; use pairwise comparisons where possible.

**Roadmap phase:** Phase 10, Literary Evaluation Loop.

## Phase-Specific Warnings

| Roadmap Phase | Likely Pitfall | Mitigation |
|---------------|----------------|------------|
| Phase 7: Living Canon | Automatic metadata is stored as authoritative truth | Add confidence, method, evidence, canonical vocabularies, and passive correction controls |
| Phase 7: Living Canon | No-form UX removes the user's ability to correct meaning | Use lightweight promote/dismiss/pin/merge/reject actions instead of required forms |
| Phase 7: Living Canon | File-name or first-line inference pollutes canon metadata | Track extraction mode and suppress low-confidence fields from graph/generation |
| Phase 8: Influence Atlas | Similarity is mistaken for literary relationship | Separate similarity, candidate relation, and validated relation edges |
| Phase 8: Influence Atlas | False lineage appears in graph paths | Require relation-specific evidence and conservative labels |
| Phase 8: Influence Atlas | Tag drift fragments graph neighborhoods | Use canonical tag IDs, synonyms, merge/deprecation, and audit reports |
| Phase 9: Generative Workshop | Generator falls back to recent or noisy context | Build context sufficiency and quality gates before generation |
| Phase 9: Generative Workshop | Provenance is displayed but not verified | Store section-level source influence and transformation evidence |
| Phase 9: Generative Workshop | Outputs collapse into product-flavored generic profundity | Require concrete source signals, contrast roles, and repetition checks |
| Phase 9: Generative Workshop | Generated drafts contaminate future retrieval | Preserve generated artifact lineage and exclude unaccepted drafts by default |
| Phase 10: Literary Evaluation Loop | Evaluation is only post-hoc scoring | Feed failures back into metadata confidence, context ranking, and generation constraints |
| Phase 10: Literary Evaluation Loop | Quote leakage and mimicry are missed | Compare generated outputs against source excerpts and prior outputs |

## Recommended v1.2 Quality Gates

1. **Metadata write gate:** No inferred field should influence graph or generation unless it has confidence, method, and canonical mapping.
2. **Graph edge gate:** No relationship should be promoted from candidate to graph-visible edge without relation-specific evidence.
3. **Generation context gate:** No automatic generation should run from only recency, low-confidence metadata, or a single homogeneous cluster.
4. **Grounding gate:** Every generated bundle should distinguish "source used as context" from "claim or image grounded in source."
5. **Leakage gate:** Generated text should be checked against source snippets and previous generated outputs before promotion.
6. **Feedback gate:** User rejection, promotion, and pairwise preference should alter future context selection without asking for manual metadata entry.

## Sources

- Project docs: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (HIGH confidence)
- Project code: `lib/atlas.ts`, `db/schema.ts`, `pages/api/generate.ts`, `pages/workshop.tsx` (HIGH confidence)
- AI metadata enrichment governance patterns: Path to Project, "AI Metadata Enrichment Governance for Enterprise Content Platforms" (MEDIUM confidence; useful taxonomy drift and governance patterns)
- RAG evaluation patterns: Evidently AI, "A complete guide to RAG evaluation"; deepset, "Measuring LLM Groundedness in RAG Systems" (MEDIUM confidence; useful groundedness and evaluation framing)
- LLM leakage and plagiarism research: "Identifying and Mitigating Privacy Risks Stemming from Language Models"; Penn State summary of text-generator plagiarism research (MEDIUM confidence; relevant to quote leakage and source mimicry)
