import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { iterationSessions, mediaItems, thoughtObjects } from '@/db/schema'
import { autoIterationPrompt, draftIteration } from '@/lib/atlas'
import { desc, inArray } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(iterationSessions).orderBy(desc(iterationSessions.updatedAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { title, prompt, mediaItemIds = [], thoughtObjectIds = [] } = req.body
    if (!mediaItemIds.length && !thoughtObjectIds.length) {
      return res.status(400).json({ error: 'At least one media or thought-object id is required' })
    }

    const media =
      mediaItemIds.length > 0
        ? await db.select().from(mediaItems).where(inArray(mediaItems.id, mediaItemIds))
        : []
    const thoughts =
      thoughtObjectIds.length > 0
        ? await db.select().from(thoughtObjects).where(inArray(thoughtObjects.id, thoughtObjectIds))
        : []
    const resolvedPrompt =
      prompt?.trim() || autoIterationPrompt({ mediaItems: media, thoughts })
    const currentDraft = draftIteration({ prompt: resolvedPrompt, mediaItems: media, thoughts })
    const history = [{ role: 'initial', prompt: resolvedPrompt, draft: currentDraft, createdAt: new Date().toISOString() }]

    const [row] = await db
      .insert(iterationSessions)
      .values({
        title: title || resolvedPrompt.slice(0, 80),
        prompt: resolvedPrompt,
        mediaItemIds,
        thoughtObjectIds,
        currentDraft,
        history,
      })
      .returning()

    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
