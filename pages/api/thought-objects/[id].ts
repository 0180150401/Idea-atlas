import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { thoughtObjects } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const [row] = await db.select().from(thoughtObjects).where(eq(thoughtObjects.id, id))
    if (!row) return res.status(404).json({ error: 'Thought-object not found' })
    return res.status(200).json(row)
  }

  if (req.method === 'PUT') {
    const { rawText } = req.body
    const [updated] = await db
      .update(thoughtObjects)
      .set({ rawText, updatedAt: sql`NOW()` })
      .where(eq(thoughtObjects.id, id))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Thought-object not found' })
    return res.status(200).json(updated)
  }

  res.setHeader('Allow', ['GET', 'PUT'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
