import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type ProvenanceItem = {
  thoughtObjectId: string
  excerpt: string
  cluster: string
  influenceWeight?: number
  formalConstraint?: string
  outputMode?: string
  centralTension?: string
  transformedRatherThanCopied?: string
}

type Bundle = {
  id: string
  aphorism: string
  counterAphorism: string
  gloss: string
  reversal: string
  hostileReading: string
  provenance: ProvenanceItem[]
  qualityStatus?: string
}

type QualityRow = {
  bundleId: string
  status: string
  flags: string[]
  guidance?: string | null
}

type RunPayload = {
  run: { id: string; routeStrategy: string | null; status: string }
  bundles: Bundle[]
  quality: QualityRow[]
}

export default function WorkshopPage() {
  const [run, setRun] = useState<RunPayload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadLatestRun() {
    const response = await fetch('/api/generation-runs/latest')
    if (response.status === 404) {
      setRun(null)
      return
    }
    if (!response.ok) throw new Error('Could not load generated content')
    setRun(await response.json())
  }

  useEffect(() => {
    loadLatestRun().catch((err) => setError(err.message))
  }, [])

  async function refreshRun() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/generation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'user-refresh' }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not refresh generated content')
      }
      setRun(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setBusy(false)
    }
  }

  const bundles = run?.bundles ?? []
  const qualityByBundle = new Map((run?.quality ?? []).map((row) => [row.bundleId, row]))

  return (
    <>
      <Head>
        <title>Generated Content - Idea Atlas</title>
        <meta name="description" content="Generated content based on the memory brain" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Generated Content</p>
            <h1>Content generated from the memory/brain</h1>
            <p className="lede">
              Loads the latest durable generation run from generation-ready memory. No prompts or
              configuration forms — refresh when the brain changes.
            </p>
          </div>
          <nav className="nav">
            <Link href="/upload">Upload Material</Link>
            <Link href="/memory">Memory/Brain</Link>
            <Link href="/generated">Generated Content</Link>
          </nav>
        </header>

        {error && <p className="error">{error}</p>}

        <section className="stack">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Automated Output Grid</p>
              <h2>{busy ? 'Refreshing generation run...' : 'Generated text boxes'}</h2>
              {run?.run.routeStrategy && (
                <p className="muted">Route strategy: {run.run.routeStrategy}</p>
              )}
            </div>
            <button className="ghostButton" disabled={busy} onClick={refreshRun} type="button">
              Refresh generated grid
            </button>
          </div>
          {bundles.length === 0 ? (
            <div className="card stack">
              <h2>No generation run yet</h2>
              <p className="muted">
                Upload material first, then refresh to create a durable generation run from
                generation-ready memory.
              </p>
              <button className="button" disabled={busy} onClick={refreshRun} type="button">
                Create first generation run
              </button>
            </div>
          ) : (
            <div className="generatedGrid">
              {bundles.map((bundle) => {
                const quality = qualityByBundle.get(bundle.id)
                if (quality?.status === 'blocked') return null
                return (
                  <article className="generatedBox" key={bundle.id}>
                    <div className="sourceChips">
                      <span>{bundle.provenance[0]?.outputMode ?? 'generated text'}</span>
                      <span>{bundle.provenance[0]?.formalConstraint ?? 'memory-driven'}</span>
                      <span>{bundle.qualityStatus ?? quality?.status ?? 'pending'}</span>
                    </div>
                    <textarea
                      readOnly
                      value={[
                        bundle.aphorism,
                        '',
                        bundle.counterAphorism,
                        '',
                        bundle.gloss,
                        '',
                        bundle.reversal,
                        '',
                        bundle.hostileReading,
                      ].join('\n')}
                    />
                    <div className="inferredPanel">
                      <h3>Memory route & quality</h3>
                      {bundle.provenance.map((item) => (
                        <p key={`${bundle.id}:${item.thoughtObjectId}`}>
                          <strong>{item.cluster}</strong> ({item.influenceWeight ?? 'n/a'}):{' '}
                          tension {item.centralTension ?? 'n/a'} —{' '}
                          {item.transformedRatherThanCopied ?? item.excerpt}
                        </p>
                      ))}
                      {quality?.flags?.length ? (
                        <p>
                          <strong>Warnings:</strong> {quality.flags.join(', ')}
                        </p>
                      ) : null}
                      {quality?.guidance ? (
                        <p>
                          <strong>Guidance:</strong> {quality.guidance}
                        </p>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
