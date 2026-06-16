import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjects } from '@/db/schema'
import { clusterLabel, cosineSimilarity, embedText, parseEmbedding } from '@/lib/atlas'
import { desc } from 'drizzle-orm'

type SearchFilters = {
  status?: string
  domain?: string
  rhetoric?: string
  axisId?: string
  minAxis?: number
  maxAxis?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { query = '', filters = {} } = req.body as { query?: string; filters?: SearchFilters }
  const queryEmbedding = embedText(query)
  const rows = await db.select().from(thoughtObjects).orderBy(desc(thoughtObjects.createdAt))

  const results = rows
    .map((row) => {
      const metadata = row.metadata as Record<string, unknown> | null
      const domains = Array.isArray(metadata?.domains) ? metadata.domains.map(String) : []
      const rhetoric = Array.isArray(metadata?.rhetoric) ? metadata.rhetoric.map(String) : []
      const coordinates = (row.worldviewCoordinates ?? {}) as Record<string, number>
      const embedding = parseEmbedding(row.embedding) || embedText(row.rawText)
      const lexicalHit = row.rawText.toLowerCase().includes(query.toLowerCase()) ? 0.25 : 0
      return {
        ...row,
        cluster: clusterLabel(row.rawText, row.metadata),
        score: Number((cosineSimilarity(queryEmbedding, embedding) + lexicalHit).toFixed(4)),
        domains,
        rhetoric,
        coordinates,
      }
    })
    .filter((row) => !filters.status || row.status === filters.status)
    .filter((row) => !filters.domain || row.domains.includes(filters.domain))
    .filter((row) => !filters.rhetoric || row.rhetoric.includes(filters.rhetoric))
    .filter((row) => {
      if (!filters.axisId) return true
      const value = row.coordinates[filters.axisId]
      if (typeof value !== 'number') return false
      if (typeof filters.minAxis === 'number' && value < filters.minAxis) return false
      if (typeof filters.maxAxis === 'number' && value > filters.maxAxis) return false
      return true
    })
    .sort((a, b) => b.score - a.score)

  return res.status(200).json(results)
}
