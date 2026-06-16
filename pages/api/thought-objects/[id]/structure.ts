import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjects, worldviewAxes } from '@/db/schema'
import { embedText, extractMetadata, worldviewCoordinates } from '@/lib/atlas'
import { eq, isNull } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const [thought] = await db.select().from(thoughtObjects).where(eq(thoughtObjects.id, id))
  if (!thought) return res.status(404).json({ error: 'Thought-object not found' })

  const axes = await db.select().from(worldviewAxes).where(isNull(worldviewAxes.deletedAt))
  const metadata = extractMetadata(thought.rawText)
  const coordinates = worldviewCoordinates(thought.rawText, axes)
  const embedding = embedText(thought.rawText)

  const [updated] = await db
    .update(thoughtObjects)
    .set({
      metadata,
      worldviewCoordinates: coordinates,
      embedding,
      status: 'ready',
    })
    .where(eq(thoughtObjects.id, id))
    .returning()

  return res.status(200).json(updated)
}
