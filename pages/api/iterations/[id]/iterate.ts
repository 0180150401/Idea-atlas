import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { iterationSessions, mediaItems, thoughtObjects } from '@/db/schema'
import { draftIteration } from '@/lib/atlas'
import { eq, inArray, sql } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const { direction = 'make it more novel while preserving provenance' } = req.body
  const [session] = await db.select().from(iterationSessions).where(eq(iterationSessions.id, id))
  if (!session) return res.status(404).json({ error: 'Iteration session not found' })

  const media =
    session.mediaItemIds.length > 0
      ? await db.select().from(mediaItems).where(inArray(mediaItems.id, session.mediaItemIds))
      : []
  const thoughts =
    session.thoughtObjectIds.length > 0
      ? await db.select().from(thoughtObjects).where(inArray(thoughtObjects.id, session.thoughtObjectIds))
      : []
  const currentDraft = draftIteration({
    prompt: session.prompt,
    mediaItems: media,
    thoughts,
    previousDraft: session.currentDraft,
    direction,
  })
  const history = [
    ...(session.history ?? []),
    { role: 'iteration', direction, draft: currentDraft, createdAt: new Date().toISOString() },
  ]

  const [updated] = await db
    .update(iterationSessions)
    .set({ currentDraft, history, updatedAt: sql`NOW()` })
    .where(eq(iterationSessions.id, id))
    .returning()

  return res.status(200).json(updated)
}
