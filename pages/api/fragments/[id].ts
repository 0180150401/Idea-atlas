import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments, thoughtObjects } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, id))
    if (!fragment) return res.status(404).json({ error: 'Fragment not found' })
    const thoughts = await db.select().from(thoughtObjects).where(eq(thoughtObjects.sourceFragmentId, id))
    return res.status(200).json({ ...fragment, thoughtObjects: thoughts })
  }

  if (req.method === 'PUT') {
    const { sourceType, title, author, citation, url, personalContext } = req.body
    // rawText is intentionally omitted — never allow mutation
    const [updated] = await db
      .update(sourceFragments)
      .set({ sourceType, title, author, citation, url, personalContext })
      .where(eq(sourceFragments.id, id))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Fragment not found' })
    return res.status(200).json(updated)
  }

  res.setHeader('Allow', ['GET', 'PUT'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
