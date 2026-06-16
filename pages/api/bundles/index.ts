import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { generationBundles } from '@/db/schema'
import { desc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const rows = await db.select().from(generationBundles).orderBy(desc(generationBundles.createdAt))
  return res.status(200).json(rows)
}
