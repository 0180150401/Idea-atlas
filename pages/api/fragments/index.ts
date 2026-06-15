import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments } from '@/db/schema'
import { desc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(sourceFragments).orderBy(desc(sourceFragments.createdAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { rawText, sourceType, title, author, citation, url, personalContext } = req.body
    if (!rawText || !sourceType) {
      return res.status(400).json({ error: 'rawText and sourceType are required' })
    }
    const [row] = await db
      .insert(sourceFragments)
      .values({ rawText, sourceType, title, author, citation, url, personalContext })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
