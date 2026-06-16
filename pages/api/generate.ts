import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { bundleEvaluations, generationBundles, generationContexts, thoughtObjects } from '@/db/schema'
import { draftBundle } from '@/lib/atlas'
import { desc, eq, inArray } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { contextId, thoughtObjectIds, outputMode, formalConstraint, revisionDirection } = req.body as {
    contextId?: string
    thoughtObjectIds?: string[]
    outputMode?: string
    formalConstraint?: string
    revisionDirection?: string
  }

  let ids = thoughtObjectIds ?? []
  if (contextId) {
    const [context] = await db
      .select()
      .from(generationContexts)
      .where(eq(generationContexts.id, contextId))
    if (!context) return res.status(404).json({ error: 'Context not found' })
    ids = context.thoughtObjectIds
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    const fallbackThoughts = await db
      .select()
      .from(thoughtObjects)
      .orderBy(desc(thoughtObjects.createdAt))
      .limit(8)
    if (fallbackThoughts.length === 0) {
      return res.status(400).json({ error: 'Upload material before generation can run' })
    }
    const bundle = draftBundle(fallbackThoughts, {
      outputMode,
      formalConstraint,
      revisionDirection,
      evaluationGuidance: await evaluationGuidance(),
    })
    const [created] = await db.insert(generationBundles).values({ ...bundle, contextId: null }).returning()
    return res.status(201).json(created)
  }

  const thoughts = await db.select().from(thoughtObjects).where(inArray(thoughtObjects.id, ids))
  if (thoughts.length === 0) return res.status(400).json({ error: 'No thought-objects found' })

  const bundle = draftBundle(thoughts, {
    outputMode,
    formalConstraint,
    revisionDirection,
    evaluationGuidance: await evaluationGuidance(),
  })
  const [created] = await db
    .insert(generationBundles)
    .values({ ...bundle, contextId })
    .returning()

  return res.status(201).json(created)
}

export async function listBundles() {
  return db.select().from(generationBundles).orderBy(desc(generationBundles.createdAt))
}

async function evaluationGuidance() {
  const rows = await db.select().from(bundleEvaluations).orderBy(desc(bundleEvaluations.createdAt)).limit(5)
  if (rows.length === 0) return 'no prior evaluations'

  const latest = rows[0]
  const guidance = []
  if (latest.quoteLeakageRisk >= 4) guidance.push('reduce quote leakage risk')
  if (latest.sourceMimicryRisk >= 4) guidance.push('transform source influence more aggressively')
  if (latest.falseLineageRisk >= 4) guidance.push('make provenance claims more conservative')
  if (latest.tensionFlatteningRisk >= 4) guidance.push('preserve unresolved tension')
  if (latest.rhetoricalForce <= 2) guidance.push('increase rhetorical force')
  if (latest.imagePrecision <= 2) guidance.push('sharpen image precision')
  if (latest.constraintAdherence <= 2) guidance.push('obey the selected formal constraint more visibly')
  return guidance.length ? guidance.join('; ') : 'continue current generation preferences'
}
