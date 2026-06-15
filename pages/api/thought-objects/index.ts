import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjects, sourceFragments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { sourceFragmentId, rawText } = req.body
    if (!sourceFragmentId || !rawText) {
      return res.status(400).json({ error: 'sourceFragmentId and rawText are required' })
    }
    const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, sourceFragmentId))
    if (!fragment) return res.status(400).json({ error: 'sourceFragmentId does not exist' })

    const [row] = await db
      .insert(thoughtObjects)
      .values({ sourceFragmentId, rawText })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
