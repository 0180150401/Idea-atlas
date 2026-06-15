import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { worldviewAxes } from '@/db/schema'
import { isNull, asc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(worldviewAxes)
      .where(isNull(worldviewAxes.deletedAt))
      .orderBy(asc(worldviewAxes.displayOrder))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { name, minLabel, maxLabel, description, displayOrder } = req.body
    if (!name || !minLabel || !maxLabel) {
      return res.status(400).json({ error: 'name, minLabel, and maxLabel are required' })
    }
    const [row] = await db
      .insert(worldviewAxes)
      .values({ name, minLabel, maxLabel, description, displayOrder: displayOrder ?? 0 })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
