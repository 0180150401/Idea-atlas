import { db } from '@/db'
import { sourceFragments, thoughtObjectRelationships, thoughtObjects } from '@/db/schema'
import { cosineSimilarityV2 } from '@/lib/ai/embeddings'
import { eq, ne } from 'drizzle-orm'
import type { RelationshipSuggestion } from '@/lib/ai/schemas'

const literaryTypes = [
  'echoes',
  'rebuts',
  'extends',
  'inverts',
  'shares-image-system',
  'shares-rhetorical-form',
] as const

export async function inferRelationshipsForThought(thoughtObjectId: string) {
  const [focus] = await db.select().from(thoughtObjects).where(eq(thoughtObjects.id, thoughtObjectId))
  if (!focus) return []

  const peers = await db.select().from(thoughtObjects).where(ne(thoughtObjects.id, thoughtObjectId))
  const [focusFragment] = await db
    .select()
    .from(sourceFragments)
    .where(eq(sourceFragments.id, focus.sourceFragmentId))

  const focusEmbedding = parseEmbeddingV2(focus.embeddingV2)
  const focusMeta = (focusFragment?.inferredMetadata ?? {}) as Record<string, unknown>
  const focusMotifs = arrayValue(focusMeta.motifs)
  const focusRhetoric = arrayValue(focusMeta.rhetoric)

  const suggestions: RelationshipSuggestion[] = []

  for (const peer of peers) {
    if (peer.generationReadiness === 'failed') continue
    const peerEmbedding = parseEmbeddingV2(peer.embeddingV2)
    const similarity = cosineSimilarityV2(focusEmbedding, peerEmbedding)
    const [peerFragment] = await db
      .select()
      .from(sourceFragments)
      .where(eq(sourceFragments.id, peer.sourceFragmentId))
    const peerMeta = (peerFragment?.inferredMetadata ?? {}) as Record<string, unknown>
    const sharedMotifs = focusMotifs.filter((motif) => arrayValue(peerMeta.motifs).includes(motif))
    const sharedRhetoric = focusRhetoric.filter((rhetoric) =>
      arrayValue(peerMeta.rhetoric).includes(rhetoric),
    )

    let type: RelationshipSuggestion['type'] | null = null
    let confidence = 0
    let evidence = ''

    if (sharedMotifs.length > 0) {
      type = 'shares-image-system'
      confidence = Math.min(0.88, 0.55 + sharedMotifs.length * 0.1)
      evidence = `Shared motifs: ${sharedMotifs.join(', ')}`
    } else if (sharedRhetoric.length > 0) {
      type = 'shares-rhetorical-form'
      confidence = Math.min(0.82, 0.5 + sharedRhetoric.length * 0.12)
      evidence = `Shared rhetoric: ${sharedRhetoric.join(', ')}`
    } else if (similarity >= 0.72) {
      type = 'echoes'
      confidence = similarity
      evidence = `Semantic similarity ${similarity.toFixed(2)} between memory nodes`
    } else if (similarity >= 0.55 && oppositeStance(focus.rawText, peer.rawText)) {
      type = 'rebuts'
      confidence = 0.58
      evidence = 'Opposing stance markers with moderate semantic overlap'
    } else if (similarity >= 0.48) {
      type = 'extends'
      confidence = 0.52
      evidence = `Moderate semantic overlap ${similarity.toFixed(2)}`
    }

    if (!type || confidence < 0.5) continue

    suggestions.push({
      fromThoughtObjectId: thoughtObjectId,
      toThoughtObjectId: peer.id,
      type,
      confidence: Number(confidence.toFixed(2)),
      evidence,
      inferenceSource: 'embedding+tags+text',
      lifecycleState: confidence >= 0.7 ? 'suggested' : 'derived',
    })
  }

  suggestions.sort((a, b) => b.confidence - a.confidence)
  const top = suggestions.slice(0, 6)

  for (const suggestion of top) {
    const existing = await db
      .select()
      .from(thoughtObjectRelationships)
      .where(
        eq(thoughtObjectRelationships.fromThoughtObjectId, suggestion.fromThoughtObjectId),
      )

    const duplicate = existing.find(
      (row) =>
        row.toThoughtObjectId === suggestion.toThoughtObjectId &&
        row.type === suggestion.type &&
        row.lifecycleState !== 'rejected',
    )
    if (duplicate) continue

    await db.insert(thoughtObjectRelationships).values({
      fromThoughtObjectId: suggestion.fromThoughtObjectId,
      toThoughtObjectId: suggestion.toThoughtObjectId,
      type: suggestion.type,
      confidence: suggestion.confidence,
      evidence: suggestion.evidence,
      inferenceSource: suggestion.inferenceSource,
      lifecycleState: suggestion.lifecycleState,
    })
  }

  return top
}

function parseEmbeddingV2(value: unknown) {
  if (Array.isArray(value)) return value.map(Number)
  if (typeof value === 'string') {
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item))
  }
  return []
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String) : []
}

function oppositeStance(a: string, b: string) {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  const neg = (text: string) => /\b(not|never|against|refuse|without)\b/.test(text)
  return neg(aLower) !== neg(bLower)
}

export { literaryTypes }
