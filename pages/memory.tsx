import Head from 'next/head'
import Link from 'next/link'
import Script from 'next/script'
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type ThoughtObject = {
  id: string
  rawText: string
  metadata: Record<string, unknown> | null
  sourceFragment?: {
    id: string
    title: string | null
    fragmentType: string
    inferredMetadata: Record<string, unknown> | null
  } | null
}

type Relationship = {
  id: string
  fromThoughtObjectId: string
  toThoughtObjectId: string
  type: string
  confidence?: number | null
  evidence?: string | null
  inferenceSource?: string | null
  lifecycleState?: string | null
}

type MemoryGraphElement = HTMLElement & { dataJson?: string }

export default function MemoryPage() {
  const graphRef = useRef<MemoryGraphElement>(null)
  const [thoughts, setThoughts] = useState<ThoughtObject[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [error, setError] = useState('')
  const [graphReady, setGraphReady] = useState(false)

  const graphData = useMemo(
    () => JSON.stringify({ thoughts, relationships }),
    [relationships, thoughts],
  )

  const loadMemory = useCallback(async () => {
    const [thoughtRes, relationshipRes] = await Promise.all([
      fetch('/api/thought-objects'),
      fetch('/api/relationships'),
    ])
    if (!thoughtRes.ok || !relationshipRes.ok) throw new Error('Could not load memory graph')
    setThoughts(await thoughtRes.json())
    setRelationships(await relationshipRes.json())
  }, [])

  useEffect(() => {
    loadMemory().catch((err) => setError(err.message))
    const timer = window.setInterval(() => {
      loadMemory().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [loadMemory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.customElements.get('memory-graph')) {
      setGraphReady(true)
      return
    }
    window.customElements.whenDefined('memory-graph').then(() => setGraphReady(true))
  }, [])

  useEffect(() => {
    if (!graphReady || !graphRef.current) return
    graphRef.current.dataJson = graphData
  }, [graphData, graphReady])

  return (
    <>
      <Head>
        <title>Memory/Brain - Idea Atlas</title>
        <meta name="description" content="Svelte node network visualizer for uploaded material" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Script
        src="/memory-graph.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.customElements.get('memory-graph')) {
            setGraphReady(true)
          } else {
            window.customElements.whenDefined('memory-graph').then(() => setGraphReady(true))
          }
        }}
      />
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Memory/Brain</p>
            <h1>Node network visualizer</h1>
            <p className="lede">
              A Svelte-powered graph of the uploaded memory. Click a node to preview the material
              and inferred metadata. No editing, no forms.
            </p>
          </div>
          <nav className="nav">
            <Link href="/upload">Upload Material</Link>
            <Link href="/memory">Memory/Brain</Link>
            <Link href="/generated">Generated Content</Link>
          </nav>
        </header>

        {error && <p className="error">{error}</p>}

        {!graphReady ? (
          <p className="muted">Loading memory graph...</p>
        ) : (
          createElement('memory-graph', {
            ref: graphRef,
            'data-json': graphData,
            key: `memory-graph-${thoughts.length}-${thoughts[0]?.id ?? 'empty'}`,
          })
        )}
      </div>
    </>
  )
}
