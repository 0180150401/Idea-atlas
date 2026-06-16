import type { generationBundles, thoughtObjects } from '@/db/schema'
import { qualityCheckSchema, type QualityCheck } from '@/lib/ai/schemas'

type BundleRow = typeof generationBundles.$inferSelect
type ThoughtRow = typeof thoughtObjects.$inferSelect

export async function runQualityChecks(bundle: BundleRow, sources: ThoughtRow[]): Promise<QualityCheck> {
  const sourceTexts = sources.map((source) => source.rawText)
  const generatedParts = [bundle.aphorism, bundle.counterAphorism, bundle.gloss, bundle.reversal, bundle.hostileReading]
  const flags: string[] = []

  const quoteLeakageRisk = scoreQuoteLeakage(generatedParts, sourceTexts, flags)
  const sourceMimicryRisk = scoreSourceMimicry(generatedParts, sourceTexts, flags)
  const falseLineageRisk = scoreFalseLineage(bundle, flags)
  const genericProfundityRisk = scoreGenericProfundity(generatedParts, flags)
  const tensionFlatteningRisk = scoreTensionFlattening(bundle, flags)
  const provenanceCoverage = scoreProvenanceCoverage(bundle, flags)

  const blocked =
    quoteLeakageRisk >= 5 ||
    sourceMimicryRisk >= 5 ||
    falseLineageRisk >= 5 ||
    (quoteLeakageRisk >= 4 && sourceMimicryRisk >= 4)

  const flagged =
    !blocked &&
    (quoteLeakageRisk >= 4 ||
      sourceMimicryRisk >= 4 ||
      genericProfundityRisk >= 4 ||
      tensionFlatteningRisk >= 4 ||
      provenanceCoverage <= 2)

  const status = blocked ? 'blocked' : flagged ? 'flagged' : 'passed'
  const guidance = buildGuidance({
    quoteLeakageRisk,
    sourceMimicryRisk,
    falseLineageRisk,
    genericProfundityRisk,
    tensionFlatteningRisk,
    provenanceCoverage,
    flags,
  })

  return qualityCheckSchema.parse({
    quoteLeakageRisk,
    sourceMimicryRisk,
    falseLineageRisk,
    genericProfundityRisk,
    tensionFlatteningRisk,
    provenanceCoverage,
    flags,
    status,
    guidance,
  })
}

function scoreQuoteLeakage(generated: string[], sources: string[], flags: string[]) {
  let hits = 0
  for (const part of generated) {
    for (const source of sources) {
      const overlap = longestSharedPhrase(part, source)
      if (overlap.length >= 24) {
        hits += 1
        flags.push(`quote-overlap:${overlap.slice(0, 40)}`)
      }
    }
  }
  if (hits >= 2) return 5
  if (hits === 1) return 4
  return 2
}

function scoreSourceMimicry(generated: string[], sources: string[], flags: string[]) {
  const distinctive = sources.flatMap((source) =>
    source
      .toLowerCase()
      .match(/[a-z']{5,}/g)
      ?.slice(0, 12) ?? [],
  )
  let overlap = 0
  for (const part of generated) {
    const lower = part.toLowerCase()
    overlap += distinctive.filter((word) => lower.includes(word)).length
  }
  if (overlap >= 8) {
    flags.push('source-mimicry:high-distinctive-overlap')
    return 5
  }
  if (overlap >= 4) return 4
  if (overlap >= 2) return 3
  return 2
}

function scoreFalseLineage(bundle: BundleRow, flags: string[]) {
  const provenance = Array.isArray(bundle.provenance) ? bundle.provenance : []
  if (provenance.length === 0) {
    flags.push('false-lineage:missing-provenance')
    return 5
  }
  const weak = provenance.filter((entry) => !entry.thoughtObjectId || !entry.excerpt).length
  if (weak > 0) {
    flags.push('false-lineage:weak-provenance-links')
    return 4
  }
  return 2
}

function scoreGenericProfundity(generated: string[], flags: string[]) {
  const cliches = ['becomes an atlas', 'hidden truth', 'profound', 'timeless wisdom', 'ultimate meaning']
  const hits = generated.filter((part) =>
    cliches.some((cliche) => part.toLowerCase().includes(cliche)),
  ).length
  if (hits >= 2) {
    flags.push('generic-profundity:cliche-density')
    return 4
  }
  if (hits === 1) return 3
  return 2
}

function scoreTensionFlattening(bundle: BundleRow, flags: string[]) {
  const provenance = Array.isArray(bundle.provenance) ? bundle.provenance : []
  const hasTension = provenance.some((entry) => Boolean(entry.centralTension))
  if (!hasTension) {
    flags.push('tension-flattening:missing-central-tension')
    return 4
  }
  if (!bundle.reversal || bundle.reversal.length < 20) return 3
  return 2
}

function scoreProvenanceCoverage(bundle: BundleRow, flags: string[]) {
  const provenance = Array.isArray(bundle.provenance) ? bundle.provenance : []
  const complete = provenance.filter(
    (entry) =>
      entry.thoughtObjectId &&
      entry.excerpt &&
      entry.influenceWeight !== undefined &&
      entry.centralTension,
  ).length
  if (complete >= provenance.length && provenance.length > 0) return 5
  if (complete >= Math.ceil(provenance.length / 2)) return 3
  flags.push('provenance:coverage-gap')
  return 2
}

function longestSharedPhrase(a: string, b: string) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean)
  const wordsB = b.toLowerCase()
  let longest = ''
  for (let i = 0; i < wordsA.length; i += 1) {
    for (let size = Math.min(8, wordsA.length - i); size >= 4; size -= 1) {
      const phrase = wordsA.slice(i, i + size).join(' ')
      if (phrase.length > longest.length && wordsB.includes(phrase)) {
        longest = phrase
      }
    }
  }
  return longest
}

function buildGuidance(input: {
  quoteLeakageRisk: number
  sourceMimicryRisk: number
  falseLineageRisk: number
  genericProfundityRisk: number
  tensionFlatteningRisk: number
  provenanceCoverage: number
  flags: string[]
}) {
  const notes = []
  if (input.quoteLeakageRisk >= 4) notes.push('reduce verbatim overlap with source material')
  if (input.sourceMimicryRisk >= 4) notes.push('transform distinctive source diction more aggressively')
  if (input.falseLineageRisk >= 4) notes.push('strengthen provenance links before accepting output')
  if (input.genericProfundityRisk >= 4) notes.push('replace abstract profundity with concrete images from memory')
  if (input.tensionFlatteningRisk >= 4) notes.push('preserve unresolved contradiction in the bundle')
  if (input.provenanceCoverage <= 2) notes.push('expand influence weights and central tension in provenance')
  return notes.length ? notes.join('; ') : 'quality checks passed'
}

export function shouldBlockDisplay(status: string) {
  return status === 'blocked'
}
