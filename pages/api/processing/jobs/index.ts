import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { processingJobs } from '@/db/schema'
import { processPendingJobs, retryEntityJobs } from '@/lib/processing'
import { desc, eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { entityType, entityId, status } = req.query
    if (entityType && entityId) {
      const jobs = await db
        .select()
        .from(processingJobs)
        .where(eq(processingJobs.entityId, String(entityId)))
        .orderBy(processingJobs.createdAt)
      return res.status(200).json(jobs)
    }

    const rows = await db
      .select()
      .from(processingJobs)
      .where(status ? eq(processingJobs.status, String(status)) : undefined)
      .orderBy(desc(processingJobs.createdAt))
      .limit(50)
    return res.status(200).json(rows)
  }

  if (req.method === 'POST') {
    const results = await processPendingJobs(20)
    return res.status(200).json({ processed: results.length, results })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
