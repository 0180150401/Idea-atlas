import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjectRelationships } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

const allowedTypes = new Set([
  'supports',
  'rebuts',
  'extends',
  'inverts',
  'descends_from',
  'echoes',
  'parodies',
  'radicalizes',
  'secularizes',
  'shares-image-system',
  'shares-rhetorical-form',
])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { lifecycleState } = req.query
    const rows = await db
      .select()
      .from(thoughtObjectRelationships)
      .where(
        typeof lifecycleState === 'string'
          ? eq(thoughtObjectRelationships.lifecycleState, lifecycleState)
          : undefined,
      )
      .orderBy(desc(thoughtObjectRelationships.createdAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const {
      fromThoughtObjectId,
      toThoughtObjectId,
      type,
      confidence,
      evidence,
      inferenceSource,
      lifecycleState,
    } = req.body
    if (!fromThoughtObjectId || !toThoughtObjectId || !allowedTypes.has(type)) {
      return res.status(400).json({ error: 'fromThoughtObjectId, toThoughtObjectId, and valid type are required' })
    }

    const [row] = await db
      .insert(thoughtObjectRelationships)
      .values({
        fromThoughtObjectId,
        toThoughtObjectId,
        type,
        confidence,
        evidence,
        inferenceSource: inferenceSource ?? 'manual',
        lifecycleState: lifecycleState ?? 'confirmed',
      })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
