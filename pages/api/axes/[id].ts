import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { worldviewAxes } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

  if (req.method === 'PUT') {
    const { name, minLabel, maxLabel, description, displayOrder } = req.body
    const [updated] = await db
      .update(worldviewAxes)
      .set({ name, minLabel, maxLabel, description, displayOrder })
      .where(eq(worldviewAxes.id, id))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Axis not found' })
    return res.status(200).json(updated)
  }

  if (req.method === 'DELETE') {
    const [updated] = await db
      .update(worldviewAxes)
      .set({ deletedAt: sql`NOW()` })
      .where(eq(worldviewAxes.id, id))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Axis not found' })
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['PUT', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
