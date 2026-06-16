import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { mediaItems, sourceFragments, thoughtObjects } from '@/db/schema'
import { enqueueFragmentPipeline } from '@/lib/processing'
import { mediaKind } from '@/lib/atlas'
import { desc } from 'drizzle-orm'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(mediaItems).orderBy(desc(mediaItems.createdAt))
    return res.status(200).json(
      rows.map(({ dataUrl, ...item }) => ({
        ...item,
        hasDataUrl: Boolean(dataUrl),
      })),
    )
  }

  if (req.method === 'POST') {
    const { fileName, mimeType, sizeBytes, dataUrl, extractedText, metadata } = req.body
    const kind = mediaKind(mimeType, fileName)

    const rawText =
      typeof extractedText === 'string' && extractedText.length > 0
        ? extractedText
        : `[Media import] ${fileName || kind}`

    const [fragment] = await db
      .insert(sourceFragments)
      .values({
        rawText,
        sourceType: kind === 'text' ? 'personal' : 'other',
        title: fileName || 'Dropped text',
        personalContext: `Imported through automatic upload as ${kind}.`,
        fragmentType: kind === 'text' ? 'pasted-text' : 'media',
        processingState: 'queued',
        generationReadiness: 'blocked',
        isPromoted: true,
      })
      .returning()

    const [thought] = await db
      .insert(thoughtObjects)
      .values({
        sourceFragmentId: fragment.id,
        rawText,
        metadata: {},
        status: 'raw',
        processingState: 'queued',
        generationReadiness: 'blocked',
        artifactType: 'source',
      })
      .returning()

    const [row] = await db
      .insert(mediaItems)
      .values({
        kind,
        fileName,
        mimeType,
        sizeBytes,
        dataUrl,
        extractedText,
        metadata: { ...(metadata ?? {}), importSurface: 'automatic-upload' },
        sourceFragmentId: fragment.id,
        processingState: 'queued',
        generationReadiness: 'blocked',
      })
      .returning()

    const jobs = await enqueueFragmentPipeline(fragment.id, thought.id)
    return res.status(201).json({ ...row, processingJobs: jobs })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
