import { hasOpenAiKey, modelAliases } from '@/lib/ai/models'

function hash(input: string) {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return Math.abs(value)
}

export function embedTextLocalV2(rawText: string) {
  const dimensions = 1536
  const buckets = new Array(dimensions).fill(0)
  const words = rawText.toLowerCase().match(/[a-z0-9]+/g) ?? []

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    for (let slot = 0; slot < 3; slot += 1) {
      buckets[hash(`${word}:${slot}`) % dimensions] += 1 / (index + 1)
    }
  }

  const magnitude = Math.sqrt(buckets.reduce((sum, value) => sum + value * value, 0)) || 1
  return buckets.map((value) => Number((value / magnitude).toFixed(6)))
}

export async function embedTextV2(rawText: string) {
  if (!hasOpenAiKey()) {
    return { vector: embedTextLocalV2(rawText), method: 'local-hash-v2' as const }
  }

  try {
    const { embed } = await import('ai')
    const { openai } = await import('@ai-sdk/openai')
    const result = await embed({
      model: openai.embedding(modelAliases.embedding),
      value: rawText.slice(0, 8000),
    })
    return { vector: result.embedding, method: 'openai-embedding' as const }
  } catch {
    return { vector: embedTextLocalV2(rawText), method: 'local-hash-v2-fallback' as const }
  }
}

export function cosineSimilarityV2(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0)
  const aMag = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0)) || 1
  const bMag = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0)) || 1
  return dot / (aMag * bMag)
}
