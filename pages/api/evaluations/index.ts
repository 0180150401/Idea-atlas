import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { bundleEvaluations } from '@/db/schema'
import { desc } from 'drizzle-orm'

function score(value: unknown) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    throw new Error('Scores must be integers from 1 to 5')
  }
  return number
}

function optionalScore(value: unknown, fallback = 3) {
  return value === undefined || value === null || value === '' ? fallback : score(value)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(bundleEvaluations).orderBy(desc(bundleEvaluations.createdAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    try {
      const {
        bundleId,
        novelty,
        worldviewFidelity,
        interpretiveDepth,
        quoteLeakageRisk,
        usefulness,
        transformativeOriginality,
        rhetoricalForce,
        imagePrecision,
        intertextualIntegrity,
        stylisticDistinctiveness,
        constraintAdherence,
        revisionUsefulness,
        genericProfundityRisk,
        sourceMimicryRisk,
        falseLineageRisk,
        tensionFlatteningRisk,
        notes,
      } = req.body

      if (!bundleId) return res.status(400).json({ error: 'bundleId is required' })

      const [row] = await db
        .insert(bundleEvaluations)
        .values({
          bundleId,
          novelty: score(novelty),
          worldviewFidelity: score(worldviewFidelity),
          interpretiveDepth: score(interpretiveDepth),
          quoteLeakageRisk: score(quoteLeakageRisk),
          usefulness: score(usefulness),
          transformativeOriginality: optionalScore(transformativeOriginality, score(novelty)),
          rhetoricalForce: optionalScore(rhetoricalForce, score(interpretiveDepth)),
          imagePrecision: optionalScore(imagePrecision),
          intertextualIntegrity: optionalScore(intertextualIntegrity),
          stylisticDistinctiveness: optionalScore(stylisticDistinctiveness),
          constraintAdherence: optionalScore(constraintAdherence),
          revisionUsefulness: optionalScore(revisionUsefulness, score(usefulness)),
          genericProfundityRisk: optionalScore(genericProfundityRisk),
          sourceMimicryRisk: optionalScore(sourceMimicryRisk),
          falseLineageRisk: optionalScore(falseLineageRisk),
          tensionFlatteningRisk: optionalScore(tensionFlatteningRisk),
          notes,
        })
        .returning()
      return res.status(201).json(row)
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid score' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
