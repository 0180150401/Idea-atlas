import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { sourceFragments, thoughtObjects } from '@/db/schema'
import { retryEntityJobs } from '@/lib/processing'
import { eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query as { id: string }
  const [fragment] = await db.select().from(sourceFragments).where(eq(sourceFragments.id, id))
  if (!fragment) return res.status(404).json({ error: 'Fragment not found' })

  const [thought] = await db
    .select()
    .from(thoughtObjects)
    .where(eq(thoughtObjects.sourceFragmentId, id))
    .limit(1)
  if (!thought) return res.status(404).json({ error: 'Thought object not found' })

  const results = await retryEntityJobs('source_fragment', id)
  return res.status(200).json({ fragmentId: id, thoughtObjectId: thought.id, results })
}
