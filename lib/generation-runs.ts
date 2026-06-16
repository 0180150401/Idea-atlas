import { db } from '@/db'
import {
  bundleEvaluations,
  generationBundleQuality,
  generationBundles,
  generationRuns,
  sourceFragments,
  thoughtObjects,
} from '@/db/schema'
import { qualityCheckSchema, type QualityCheck } from '@/lib/ai/schemas'
import { draftBundle } from '@/lib/atlas'
import { runQualityChecks } from '@/lib/quality'
import { desc, eq, inArray } from 'drizzle-orm'

const autoGenerationModes = [
  { outputMode: 'literary fragment', formalConstraint: 'image-based metaphor' },
  { outputMode: 'aphorism bundle', formalConstraint: 'paradox' },
  { outputMode: 'essay seed', formalConstraint: 'antithesis' },
  { outputMode: 'conceptual draft', formalConstraint: 'prose fragment' },
  { outputMode: 'manifesto', formalConstraint: 'reversal' },
  { outputMode: 'poetic variation', formalConstraint: 'aphorism' },
]

export async function createGenerationRun(trigger = 'automatic') {
  const readyThoughts = await db
    .select()
    .from(thoughtObjects)
    .where(eq(thoughtObjects.generationReadiness, 'ready'))
    .orderBy(desc(thoughtObjects.updatedAt))
    .limit(8)

  const fallbackThoughts =
    readyThoughts.length > 0
      ? readyThoughts
      : await db.select().from(thoughtObjects).orderBy(desc(thoughtObjects.createdAt)).limit(8)

  if (fallbackThoughts.length === 0) {
    throw new Error('Upload material before generation can run')
  }

  const contextSnapshot = {
    thoughtObjectIds: fallbackThoughts.map((thought) => thought.id),
    routeStrategy: readyThoughts.length >= 3 ? 'generation-ready-cluster' : 'recent-fallback',
    selectedAt: new Date().toISOString(),
    readinessCounts: {
      ready: readyThoughts.length,
      fallbackUsed: readyThoughts.length === 0,
    },
  }

  const [run] = await db
    .insert(generationRuns)
    .values({
      status: 'running',
      trigger,
      contextSnapshot,
      routeStrategy: String(contextSnapshot.routeStrategy),
      qualityThresholds: {
        maxQuoteLeakageRisk: 4,
        maxSourceMimicryRisk: 4,
        maxGenericProfundityRisk: 4,
      },
      outputPlan: autoGenerationModes,
    })
    .returning()

  try {
    const guidance = await evaluationGuidance()
    const bundleIds: string[] = []

    for (const mode of autoGenerationModes) {
      const bundle = draftBundle(fallbackThoughts, {
        ...mode,
        revisionDirection: 'automatic generation from generation-ready memory',
        evaluationGuidance: guidance,
      })
      const [created] = await db
        .insert(generationBundles)
        .values({
          ...bundle,
          contextId: null,
          generationRunId: run.id,
          acceptanceState: 'draft',
          qualityStatus: 'pending',
        })
        .returning()

      const quality = await runQualityChecks(created, fallbackThoughts)
      await persistQuality(created.id, run.id, quality)
      bundleIds.push(created.id)
    }

    await db
      .update(generationRuns)
      .set({
        status: 'succeeded',
        bundleIds,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generationRuns.id, run.id))

    return getGenerationRun(run.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation run failed'
    await db
      .update(generationRuns)
      .set({ status: 'failed', error: message, updatedAt: new Date() })
      .where(eq(generationRuns.id, run.id))
    throw error
  }
}

export async function getLatestCompletedRun() {
  const [run] = await db
    .select()
    .from(generationRuns)
    .where(eq(generationRuns.status, 'succeeded'))
    .orderBy(desc(generationRuns.completedAt))
    .limit(1)

  if (!run) return null
  return getGenerationRun(run.id)
}

export async function getGenerationRun(runId: string) {
  const [run] = await db.select().from(generationRuns).where(eq(generationRuns.id, runId))
  if (!run) return null

  const bundles =
    run.bundleIds.length > 0
      ? await db.select().from(generationBundles).where(inArray(generationBundles.id, run.bundleIds))
      : []

  const qualityRows =
    bundles.length > 0
      ? await db
          .select()
          .from(generationBundleQuality)
          .where(inArray(generationBundleQuality.bundleId, bundles.map((bundle) => bundle.id)))
      : []

  return { run, bundles, quality: qualityRows }
}

async function persistQuality(bundleId: string, generationRunId: string, quality: QualityCheck) {
  const parsed = qualityCheckSchema.parse(quality)
  await db.insert(generationBundleQuality).values({
    bundleId,
    generationRunId,
    status: parsed.status,
    quoteLeakageRisk: parsed.quoteLeakageRisk,
    sourceMimicryRisk: parsed.sourceMimicryRisk,
    falseLineageRisk: parsed.falseLineageRisk,
    genericProfundityRisk: parsed.genericProfundityRisk,
    tensionFlatteningRisk: parsed.tensionFlatteningRisk,
    provenanceCoverage: parsed.provenanceCoverage,
    flags: parsed.flags,
    guidance: parsed.guidance,
  })

  await db
    .update(generationBundles)
    .set({
      qualityStatus: parsed.status === 'blocked' ? 'blocked' : parsed.status === 'flagged' ? 'flagged' : 'passed',
      acceptanceState: parsed.status === 'passed' ? 'accepted' : 'draft',
    })
    .where(eq(generationBundles.id, bundleId))
}

async function evaluationGuidance() {
  const rows = await db.select().from(bundleEvaluations).orderBy(desc(bundleEvaluations.createdAt)).limit(5)
  if (rows.length === 0) return 'no prior evaluations'

  const latest = rows[0]
  const guidance = []
  if (latest.quoteLeakageRisk >= 4) guidance.push('reduce quote leakage risk')
  if (latest.sourceMimicryRisk >= 4) guidance.push('transform source influence more aggressively')
  if (latest.falseLineageRisk >= 4) guidance.push('make provenance claims more conservative')
  if (latest.tensionFlatteningRisk >= 4) guidance.push('preserve unresolved tension')
  return guidance.length ? guidance.join('; ') : 'continue current generation preferences'
}

export async function sourceTextsForThoughts(thoughtIds: string[]) {
  if (thoughtIds.length === 0) return []
  const thoughts = await db.select().from(thoughtObjects).where(inArray(thoughtObjects.id, thoughtIds))
  const fragmentIds = thoughts.map((thought) => thought.sourceFragmentId)
  const fragments =
    fragmentIds.length > 0
      ? await db.select().from(sourceFragments).where(inArray(sourceFragments.id, fragmentIds))
      : []
  const fragmentMap = new Map(fragments.map((fragment) => [fragment.id, fragment.rawText]))
  return thoughts.map((thought) => fragmentMap.get(thought.sourceFragmentId) ?? thought.rawText)
}
