import type { NextApiRequest, NextApiResponse } from 'next'
import { retryEntityJobs } from '@/lib/processing'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { entityType, entityId } = req.body as { entityType?: string; entityId?: string }
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType and entityId are required' })
  }

  const results = await retryEntityJobs(entityType, entityId)
  return res.status(200).json({ retried: true, results })
}
