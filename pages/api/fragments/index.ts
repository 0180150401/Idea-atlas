import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { processingJobs, sourceFragments, thoughtObjects } from '@/db/schema'
import { enqueueFragmentPipeline } from '@/lib/processing'
import { and, desc, eq } from 'drizzle-orm'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { promoted, fragmentType, canonRelationship } = req.query
    const conditions = []
    if (promoted === 'true') conditions.push(eq(sourceFragments.isPromoted, true))
    if (typeof fragmentType === 'string') conditions.push(eq(sourceFragments.fragmentType, fragmentType))
    if (typeof canonRelationship === 'string') {
      conditions.push(eq(sourceFragments.canonRelationship, canonRelationship))
    }

    const rows = await db
      .select()
      .from(sourceFragments)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(sourceFragments.createdAt))

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const jobs = await db
          .select()
          .from(processingJobs)
          .where(
            and(eq(processingJobs.entityType, 'source_fragment'), eq(processingJobs.entityId, row.id)),
          )
        return { ...row, processingJobs: jobs }
      }),
    )

    return res.status(200).json(enriched)
  }

  if (req.method === 'POST') {
    const {
      rawText,
      sourceType,
      title,
      author,
      citation,
      url,
      personalContext,
      fragmentType,
      canonRelationship,
      isPromoted,
    } = req.body
    if (typeof rawText !== 'string' || !sourceType) {
      return res.status(400).json({ error: 'rawText and sourceType are required' })
    }

    const [row] = await db
      .insert(sourceFragments)
      .values({
        rawText,
        sourceType,
        title,
        author,
        citation,
        url,
        personalContext,
        fragmentType: fragmentType ?? 'pasted-text',
        canonRelationship: canonRelationship ?? null,
        isPromoted: isPromoted ?? true,
        processingState: 'queued',
        generationReadiness: 'blocked',
      })
      .returning()

    const [thought] = await db
      .insert(thoughtObjects)
      .values({
        sourceFragmentId: row.id,
        rawText,
        metadata: {},
        status: 'raw',
        processingState: 'queued',
        generationReadiness: 'blocked',
        artifactType: 'source',
      })
      .returning()

    const jobs = await enqueueFragmentPipeline(row.id, thought.id)
    return res.status(201).json({ ...row, thoughtObjectId: thought.id, processingJobs: jobs })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
