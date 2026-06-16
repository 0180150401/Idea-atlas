import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { pairwiseComparisons } from '@/db/schema'
import { desc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(pairwiseComparisons)
      .orderBy(desc(pairwiseComparisons.createdAt))
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { leftBundleId, rightBundleId, preferredBundleId, notes } = req.body
    if (!leftBundleId || !rightBundleId || !preferredBundleId) {
      return res
        .status(400)
        .json({ error: 'leftBundleId, rightBundleId, and preferredBundleId are required' })
    }

    const [row] = await db
      .insert(pairwiseComparisons)
      .values({ leftBundleId, rightBundleId, preferredBundleId, notes })
      .returning()
    return res.status(201).json(row)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
