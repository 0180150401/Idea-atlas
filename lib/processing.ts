import { db } from '@/db'
import {
  metadataExtractions,
  processingJobs,
  sourceFragments,
  tags,
  thoughtObjectRelationships,
  thoughtObjects,
  thoughtObjectTags,
} from '@/db/schema'
import { embedTextV2 } from '@/lib/ai/embeddings'
import {
  extractLiteraryMetadata,
  generationReadinessFromScore,
  metadataToTagAssignments,
} from '@/lib/metadata-pipeline'
import { inferRelationshipsForThought } from '@/lib/relationship-inference'
import { extractMetadata, embedText } from '@/lib/atlas'
import { and, eq, inArray } from 'drizzle-orm'

export type JobType =
  | 'enrich_metadata'
  | 'embed'
  | 'normalize_tags'
  | 'infer_relationships'
  | 'mark_ready'

export type ProcessingState = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped'
export type GenerationReadiness = 'blocked' | 'partial' | 'ready' | 'failed'

const pipeline: JobType[] = ['enrich_metadata', 'embed', 'normalize_tags', 'infer_relationships', 'mark_ready']

export async function enqueueFragmentPipeline(sourceFragmentId: string, thoughtObjectId: string) {
  const jobs = pipeline.map((jobType) => ({
    entityType: 'source_fragment' as const,
    entityId: sourceFragmentId,
    jobType,
    idempotencyKey: `${sourceFragmentId}:${jobType}`,
  }))

  await db
    .insert(processingJobs)
    .values(jobs)
    .onConflictDoNothing({ target: processingJobs.idempotencyKey })

  await db
    .update(sourceFragments)
    .set({ processingState: 'queued', generationReadiness: 'blocked' })
    .where(eq(sourceFragments.id, sourceFragmentId))

  await db
    .update(thoughtObjects)
    .set({ processingState: 'queued', generationReadiness: 'blocked', status: 'raw' })
    .where(eq(thoughtObjects.id, thoughtObjectId))

  return processPendingJobs(12)
}

export async function processPendingJobs(limit = 10) {
  const queued = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.status, 'queued'))
    .orderBy(processingJobs.createdAt)
    .limit(limit)

  const results = []
  for (const job of queued) {
    results.push(await runJob(job.id))
  }
  return results
}

export async function retryEntityJobs(entityType: string, entityId: string) {
  await db
    .update(processingJobs)
    .set({
      status: 'queued',
      error: null,
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
    })
    .where(and(eq(processingJobs.entityType, entityType), eq(processingJobs.entityId, entityId)))

  if (entityType === 'source_fragment') {
    await db
      .update(sourceFragments)
      .set({ processingState: 'queued' })
      .where(eq(sourceFragments.id, entityId))
  }

  return processPendingJobs(12)
}

async function runJob(jobId: string) {
  const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId))
  if (!job || job.status !== 'queued') return job

  await db
    .update(processingJobs)
    .set({
      status: 'running',
      attempts: job.attempts + 1,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(processingJobs.id, jobId))

  try {
    const result = await executeJob(job.jobType as JobType, job.entityId)
    await db
      .update(processingJobs)
      .set({
        status: 'succeeded',
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
        error: null,
      })
      .where(eq(processingJobs.id, jobId))
    return { ...job, status: 'succeeded' as const, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed'
    const failed = job.attempts + 1 >= job.maxAttempts
    await db
      .update(processingJobs)
      .set({
        status: failed ? 'failed' : 'queued',
        error: message,
        updatedAt: new Date(),
        completedAt: failed ? new Date() : null,
      })
      .where(eq(processingJobs.id, jobId))

    if (failed) {
      await markEntityFailed(job.entityType, job.entityId, message)
    }
    throw error
  }
}

async function executeJob(jobType: JobType, sourceFragmentId: string) {
  const [fragment] = await db
    .select()
    .from(sourceFragments)
    .where(eq(sourceFragments.id, sourceFragmentId))
  if (!fragment) throw new Error('Source fragment not found')

  const [thought] = await db
    .select()
    .from(thoughtObjects)
    .where(eq(thoughtObjects.sourceFragmentId, sourceFragmentId))
    .limit(1)
  if (!thought) throw new Error('Thought object not found')

  await db
    .update(sourceFragments)
    .set({ processingState: 'running' })
    .where(eq(sourceFragments.id, sourceFragmentId))
  await db
    .update(thoughtObjects)
    .set({ processingState: 'running' })
    .where(eq(thoughtObjects.id, thought.id))

  switch (jobType) {
    case 'enrich_metadata':
      return enrichMetadata(fragment, thought)
    case 'embed':
      return embedThought(thought)
    case 'normalize_tags':
      return normalizeTags(thought)
    case 'infer_relationships':
      return inferRelationships(thought.id)
    case 'mark_ready':
      return markReady(fragment.id, thought.id)
    default:
      throw new Error(`Unknown job type: ${jobType}`)
  }
}

async function enrichMetadata(
  fragment: typeof sourceFragments.$inferSelect,
  thought: typeof thoughtObjects.$inferSelect,
) {
  const extraction = extractLiteraryMetadata(fragment.rawText, fragment.fragmentType)
  await db
    .update(sourceFragments)
    .set({ inferredMetadata: extraction.flat })
    .where(eq(sourceFragments.id, fragment.id))

  await db.insert(metadataExtractions).values({
    sourceFragmentId: fragment.id,
    thoughtObjectId: thought.id,
    method: extraction.provenance.method,
    provider: extraction.provenance.provider,
    model: extraction.provenance.model,
    schemaVersion: extraction.provenance.schemaVersion,
    rawOutput: extraction.normalized as Record<string, unknown>,
    normalizedOutput: extraction.flat,
    confidence: extraction.normalized.confidence ?? 0.5,
    warnings: extraction.warnings,
  })

  await db
    .update(thoughtObjects)
    .set({
      metadata: {
        ...(thought.metadata as Record<string, unknown> | null),
        literary: extraction.normalized,
        factual: extraction.normalized.factual,
        textual: extraction.normalized.textual,
        interpretive: extraction.normalized.interpretive,
      },
      status: 'structured',
    })
    .where(eq(thoughtObjects.id, thought.id))

  return { extractionId: fragment.id, confidence: extraction.normalized.confidence }
}

async function embedThought(thought: typeof thoughtObjects.$inferSelect) {
  const legacy = embedText(thought.rawText)
  const semantic = await embedTextV2(thought.rawText)
  await db
    .update(thoughtObjects)
    .set({
      embedding: legacy,
      embeddingV2: semantic.vector,
      status: 'embedded',
    })
    .where(eq(thoughtObjects.id, thought.id))
  return { method: semantic.method, dimensions: semantic.vector.length }
}

async function normalizeTags(thought: typeof thoughtObjects.$inferSelect) {
  const [fragment] = await db
    .select()
    .from(sourceFragments)
    .where(eq(sourceFragments.id, thought.sourceFragmentId))
  const literary = (thought.metadata as { literary?: ReturnType<typeof extractLiteraryMetadata>['normalized'] })
    ?.literary
  const normalized =
    literary ??
    extractLiteraryMetadata(fragment?.rawText ?? thought.rawText, fragment?.fragmentType).normalized
  const assignments = metadataToTagAssignments(thought.id, normalized, thought.rawText)

  await db.delete(thoughtObjectTags).where(eq(thoughtObjectTags.thoughtObjectId, thought.id))

  for (const assignment of assignments) {
    const canonicalKey = `${assignment.family}:${assignment.label}`
    const [tag] = await db
      .insert(tags)
      .values({
        family: assignment.family,
        label: assignment.label,
        canonicalKey,
        definition: `Auto-normalized ${assignment.family} tag`,
      })
      .onConflictDoUpdate({
        target: tags.canonicalKey,
        set: { label: assignment.label },
      })
      .returning()

    await db.insert(thoughtObjectTags).values({
      thoughtObjectId: thought.id,
      tagId: tag.id,
      confidence: assignment.confidence,
      source: 'inferred',
      evidence: assignment.evidence,
      lifecycleState: assignment.lifecycleState,
    })
  }

  return { tagCount: assignments.length }
}

async function inferRelationships(thoughtObjectId: string) {
  const suggestions = await inferRelationshipsForThought(thoughtObjectId)
  return { suggestedCount: suggestions.length }
}

async function markReady(sourceFragmentId: string, thoughtObjectId: string) {
  const [fragment] = await db
    .select()
    .from(sourceFragments)
    .where(eq(sourceFragments.id, sourceFragmentId))
  const readinessScore =
    (fragment?.inferredMetadata as { generationReadinessScore?: number } | null)
      ?.generationReadinessScore ?? 0.4
  const quoteLeak = (fragment?.inferredMetadata as { quoteLeak?: string } | null)?.quoteLeak
  const readiness = generationReadinessFromScore(readinessScore, quoteLeak)

  await db
    .update(sourceFragments)
    .set({ processingState: 'succeeded', generationReadiness: readiness })
    .where(eq(sourceFragments.id, sourceFragmentId))

  await db
    .update(thoughtObjects)
    .set({
      processingState: 'succeeded',
      generationReadiness: readiness,
      status: readiness === 'ready' ? 'ready' : 'structured',
    })
    .where(eq(thoughtObjects.id, thoughtObjectId))

  const [updatedThought] = await db
    .select()
    .from(thoughtObjects)
    .where(eq(thoughtObjects.id, thoughtObjectId))
  if (updatedThought) {
    await db
      .update(thoughtObjects)
      .set({
        metadata: {
          ...((updatedThought.metadata as Record<string, unknown> | null) ?? {}),
          generationReadiness: readiness,
          generationReadinessScore: readinessScore,
        },
      })
      .where(eq(thoughtObjects.id, thoughtObjectId))
  }

  return { generationReadiness: readiness, readinessScore }
}

async function markEntityFailed(entityType: string, entityId: string, message: string) {
  if (entityType === 'source_fragment') {
    await db
      .update(sourceFragments)
      .set({ processingState: 'failed', generationReadiness: 'failed' })
      .where(eq(sourceFragments.id, entityId))
    const relatedThoughts = await db
      .select({ id: thoughtObjects.id })
      .from(thoughtObjects)
      .where(eq(thoughtObjects.sourceFragmentId, entityId))
    if (relatedThoughts[0]) {
      await db
        .update(thoughtObjects)
        .set({ processingState: 'failed', generationReadiness: 'failed' })
        .where(eq(thoughtObjects.id, relatedThoughts[0].id))
    }
  }
  return message
}

export async function listJobsForEntity(entityType: string, entityId: string) {
  return db
    .select()
    .from(processingJobs)
    .where(and(eq(processingJobs.entityType, entityType), eq(processingJobs.entityId, entityId)))
    .orderBy(processingJobs.createdAt)
}

export async function getProcessingSummary(entityIds: string[]) {
  if (entityIds.length === 0) return []
  return db
    .select()
    .from(processingJobs)
    .where(
      and(
        eq(processingJobs.entityType, 'source_fragment'),
        inArray(processingJobs.entityId, entityIds),
      ),
    )
}
