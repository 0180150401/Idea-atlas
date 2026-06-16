import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestCompletedRun } from '@/lib/generation-runs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const latest = await getLatestCompletedRun()
  if (!latest) {
    return res.status(404).json({ error: 'No completed generation run yet' })
  }

  return res.status(200).json(latest)
}
