import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { generationContexts } from '@/db/schema'
import { desc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(generationContexts).orderBy(desc(generationContexts.createdAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { name, query, filters, thoughtObjectIds } = req.body
    if (!name || !Array.isArray(thoughtObjectIds) || thoughtObjectIds.length === 0) {
      return res.status(400).json({ error: 'name and thoughtObjectIds are required' })
    }

    const [row] = await db
      .insert(generationContexts)
      .values({ name, query, filters, thoughtObjectIds })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
