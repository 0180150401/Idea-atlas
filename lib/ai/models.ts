export const SCHEMA_VERSION = 'v1.2'

export const modelAliases = {
  metadataFast: process.env.OPENAI_METADATA_MODEL || 'gpt-4o-mini',
  embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  literaryGeneration: process.env.OPENAI_GENERATION_MODEL || 'gpt-4o-mini',
} as const

export function extractionProvenance(method: 'heuristic' | 'ai') {
  return {
    method,
    provider: method === 'ai' ? 'openai' : 'local',
    model: method === 'ai' ? modelAliases.metadataFast : 'heuristic-v1',
    schemaVersion: SCHEMA_VERSION,
  }
}

export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}
