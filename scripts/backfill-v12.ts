/**
 * Backfill v1.2 processing state, embeddings v2, tags, and relationships for existing records.
 * Safe to run repeatedly — uses idempotent job keys and upserts.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { db } from '../db'
import { sourceFragments, thoughtObjects } from '../db/schema'
import { enqueueFragmentPipeline } from '../lib/processing'
import { eq } from 'drizzle-orm'

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex <= 0) continue
      const key = trimmed.slice(0, eqIndex)
      if (!process.env[key]) {
        process.env[key] = trimmed.slice(eqIndex + 1)
      }
    }
  } catch {
    // .env.local optional when DATABASE_URL is already exported
  }
}

loadEnvLocal()
import { sourceFragments, thoughtObjects } from '../db/schema'
import { enqueueFragmentPipeline } from '../lib/processing'
import { eq } from 'drizzle-orm'

async function main() {
  const fragments = await db.select().from(sourceFragments)
  let queued = 0

  for (const fragment of fragments) {
    const [thought] = await db
      .select()
      .from(thoughtObjects)
      .where(eq(thoughtObjects.sourceFragmentId, fragment.id))
      .limit(1)

    if (!thought) continue
    await enqueueFragmentPipeline(fragment.id, thought.id)
    queued += 1
  }

  console.log(`Backfill queued processing for ${queued} fragment(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
