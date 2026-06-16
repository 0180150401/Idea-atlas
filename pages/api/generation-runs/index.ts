import type { NextApiRequest, NextApiResponse } from 'next'
import { createGenerationRun } from '@/lib/generation-runs'
import { db } from '@/db'
import { generationRuns } from '@/db/schema'
import { desc } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(generationRuns).orderBy(desc(generationRuns.createdAt)).limit(20)
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const { trigger } = req.body as { trigger?: string }
    const result = await createGenerationRun(trigger ?? 'manual-refresh')
    return res.status(201).json(result)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
