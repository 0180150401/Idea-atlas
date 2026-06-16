import { literaryMetadataSchema, type LiteraryMetadata, type TagAssignment } from '@/lib/ai/schemas'
import { extractionProvenance } from '@/lib/ai/models'
import { inferCanonMetadata, extractMetadata } from '@/lib/atlas'

const tagFamilies = ['domain', 'motif', 'form', 'affect', 'worldview', 'source', 'risk'] as const

function snippetAround(text: string, needle: string) {
  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return text.slice(0, 120)
  const start = Math.max(0, index - 40)
  return text.slice(start, start + 120).trim()
}

export function extractLiteraryMetadata(rawText: string, fragmentType = 'pasted-text') {
  const heuristic = inferCanonMetadata(rawText, fragmentType)
  const textual = extractMetadata(rawText)
  const warnings: string[] = []

  const evidence: LiteraryMetadata['evidence'] = {}
  if (heuristic.genreForm) {
    evidence.genreForm = {
      value: heuristic.genreForm,
      confidence: 0.62,
      snippet: snippetAround(rawText, String(heuristic.genreForm)),
      method: 'heuristic-marker',
    }
  }
  if (heuristic.motifs?.length) {
    evidence.motifs = {
      value: heuristic.motifs,
      confidence: 0.58,
      snippet: snippetAround(rawText, heuristic.motifs[0]),
      method: 'heuristic-marker',
    }
  }
  if (heuristic.quoteLeak) {
    evidence.quoteLeak = {
      value: heuristic.quoteLeak,
      confidence: heuristic.quoteLeak === 'possible-verbatim-quote' ? 0.72 : 0.45,
      snippet: rawText.slice(0, 120),
      method: 'quote-pattern',
    }
  }

  const normalized: LiteraryMetadata = {
    factual: {
      title: heuristic.title,
      sourceHints: heuristic.sourceHints,
      fragmentType,
    },
    textual: {
      genreForm: heuristic.genreForm,
      rhetoric: heuristic.rhetoric ?? textual.rhetoric,
      motifs: heuristic.motifs,
      keywords: heuristic.keywords,
      affectiveRegister: heuristic.affectiveRegister,
    },
    interpretive: {
      domains: heuristic.domains ?? textual.domains,
      worldviewTension: textual.stance,
      quoteLeak: heuristic.quoteLeak,
      provenance: heuristic.provenance,
    },
    evidence,
    confidence: computeMetadataConfidence(evidence, rawText),
    warnings,
  }

  const parsed = literaryMetadataSchema.safeParse(normalized)
  if (!parsed.success) {
    warnings.push('metadata schema validation produced warnings')
  }

  return {
    normalized: parsed.success ? parsed.data : normalized,
    flat: flattenForStorage(normalized, heuristic),
    provenance: extractionProvenance('heuristic'),
    warnings,
  }
}

function flattenForStorage(normalized: LiteraryMetadata, heuristic: ReturnType<typeof inferCanonMetadata>) {
  return {
    ...heuristic,
    factual: normalized.factual,
    textual: normalized.textual,
    interpretive: normalized.interpretive,
    evidence: normalized.evidence,
    generationReadinessScore: computeGenerationReadinessScore(normalized, heuristic),
  }
}

function computeMetadataConfidence(
  evidence: LiteraryMetadata['evidence'],
  rawText: string,
) {
  const values = Object.values(evidence ?? {}).map((entry) => entry.confidence)
  const base = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.35
  const lengthBoost = rawText.trim().length > 120 ? 0.08 : 0
  return Number(Math.min(0.95, base + lengthBoost).toFixed(2))
}

export function computeGenerationReadinessScore(
  normalized: LiteraryMetadata,
  heuristic: ReturnType<typeof inferCanonMetadata>,
) {
  let score = normalized.confidence ?? 0.4
  if ((normalized.textual?.motifs?.length ?? 0) > 0) score += 0.08
  if ((normalized.textual?.rhetoric?.length ?? 0) > 0) score += 0.06
  if ((normalized.interpretive?.domains?.length ?? 0) > 0) score += 0.06
  if (heuristic.quoteLeak === 'possible-verbatim-quote') score -= 0.12
  if ((normalized.factual?.sourceHints?.length ?? 0) > 0) score += 0.05
  return Number(Math.max(0, Math.min(1, score)).toFixed(2))
}

export function generationReadinessFromScore(score: number, quoteLeak?: string) {
  if (quoteLeak === 'possible-verbatim-quote' && score < 0.55) return 'blocked'
  if (score >= 0.62) return 'ready'
  if (score >= 0.42) return 'partial'
  return 'blocked'
}

export function metadataToTagAssignments(
  thoughtObjectId: string,
  normalized: LiteraryMetadata,
  rawText: string,
): TagAssignment[] {
  const assignments: TagAssignment[] = []
  const push = (
    family: TagAssignment['family'],
    label: string,
    confidence: number,
    evidence?: string,
  ) => {
    if (!label) return
    assignments.push({
      family,
      label: label.toLowerCase().replace(/\s+/g, '-'),
      confidence,
      evidence: evidence ?? rawText.slice(0, 120),
      lifecycleState: confidence >= 0.65 ? 'suggested' : 'weak',
    })
  }

  for (const domain of normalized.interpretive?.domains ?? []) {
    push('domain', domain, 0.66, snippetAround(rawText, domain))
  }
  for (const motif of normalized.textual?.motifs ?? []) {
    push('motif', motif, 0.64, snippetAround(rawText, motif))
  }
  if (normalized.textual?.genreForm) {
    push('form', normalized.textual.genreForm, 0.6)
  }
  if (normalized.textual?.affectiveRegister) {
    push('affect', normalized.textual.affectiveRegister, 0.58)
  }
  if (normalized.interpretive?.worldviewTension) {
    push('worldview', normalized.interpretive.worldviewTension, 0.55)
  }
  if (normalized.factual?.sourceHints) {
    push('source', 'source-hint-present', 0.52, normalized.factual.sourceHints)
  }
  if (normalized.interpretive?.quoteLeak === 'possible-verbatim-quote') {
    push('risk', 'quote-leakage', 0.72, rawText.slice(0, 120))
  }

  return assignments.filter((item) => tagFamilies.includes(item.family))
}
