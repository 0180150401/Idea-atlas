import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, id))
  if (!fragment) return res.status(404).json({ error: 'Fragment not found' })

  const [updated] = await db
    .update(sourceFragments)
    .set({ isPromoted: !fragment.isPromoted })
    .where(eq(sourceFragments.id, id))
    .returning()

  return res.status(200).json(updated)
}
