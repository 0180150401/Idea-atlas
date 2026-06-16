import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjects, sourceFragments } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db
      .select({ thought: thoughtObjects, sourceFragment: sourceFragments })
      .from(thoughtObjects)
      .leftJoin(sourceFragments, eq(thoughtObjects.sourceFragmentId, sourceFragments.id))
      .orderBy(desc(thoughtObjects.createdAt))
    return res.status(200).json(
      rows.map((row) => ({
        ...row.thought,
        sourceFragment: row.sourceFragment,
      })),
    )
  }

  if (req.method === 'POST') {
    const { sourceFragmentId, rawText } = req.body
    if (!sourceFragmentId || typeof rawText !== 'string') {
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

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
