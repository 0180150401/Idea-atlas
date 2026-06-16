import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type ThoughtObject = {
  id: string
  sourceFragmentId: string
  rawText: string
  status: string
  metadata: Record<string, unknown> | null
  worldviewCoordinates: Record<string, number> | null
  cluster?: string
  score?: number
  sourceFragment?: {
    id: string
    title: string | null
    author: string | null
    fragmentType: string
    canonRelationship: string | null
    isPromoted: boolean
    inferredMetadata: Record<string, unknown> | null
  } | null
}

type Axis = {
  id: string
  name: string
  minLabel: string
  maxLabel: string
}

type Context = {
  id: string
  name: string
  thoughtObjectIds: string[]
}

type Bundle = {
  id: string
  aphorism: string
  counterAphorism: string
  gloss: string
  reversal: string
  hostileReading: string
  provenance: Array<{ thoughtObjectId: string; excerpt: string; cluster: string }>
}

type Relationship = {
  id: string
  fromThoughtObjectId: string
  toThoughtObjectId: string
  type: string
}

type GraphNode = {
  id: string
  label: string
  type: 'author' | 'work' | 'passage' | 'motif' | 'rhetoric' | 'tension' | 'affect' | 'draft'
  x: number
  y: number
  cluster: string
  status?: string
  thought?: ThoughtObject
  bundle?: Bundle
}

type GraphEdge = {
  id: string
  source: string
  target: string
  type: string
  storage: 'cluster' | 'relationship' | 'literary' | 'generation'
}

const relationshipTypes = [
  'echoes',
  'rebuts',
  'extends',
  'inverts',
  'parodies',
  'descends_from',
  'radicalizes',
  'secularizes',
  'shares_image_system',
  'shares_rhetorical_form',
]
const creativeRoutes = ['core_cluster', 'adjacent_contradiction', 'distant_analogue', 'unresolved_tension', 'border_zone']
const graphWidth = 1100
const graphHeight = 640

export default function AtlasPage() {
  const [thoughts, setThoughts] = useState<ThoughtObject[]>([])
  const [results, setResults] = useState<ThoughtObject[]>([])
  const [axes, setAxes] = useState<Axis[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [routeName, setRouteName] = useState('')
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('')
  const [rhetoric, setRhetoric] = useState('')
  const [relationship, setRelationship] = useState({
    fromThoughtObjectId: '',
    toThoughtObjectId: '',
    type: 'echoes',
  })
  const [evaluation, setEvaluation] = useState({
    novelty: 3,
    worldviewFidelity: 3,
    interpretiveDepth: 3,
    quoteLeakageRisk: 3,
    usefulness: 3,
    notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const visibleThoughts = results.length > 0 ? results : thoughts
  const clusters = useMemo(() => {
    return visibleThoughts.reduce<Record<string, ThoughtObject[]>>((groups, thought) => {
      const cluster = getThoughtCluster(thought)
      groups[cluster] = [...(groups[cluster] ?? []), thought]
      return groups
    }, {})
  }, [visibleThoughts])
  const graph = useMemo(
    () => buildNetworkGraph(visibleThoughts, relationships, bundles),
    [bundles, relationships, visibleThoughts],
  )

  async function loadAll() {
    const [thoughtRes, axesRes, contextsRes, bundlesRes, relationshipRes] = await Promise.all([
      fetch('/api/thought-objects'),
      fetch('/api/axes'),
      fetch('/api/contexts'),
      fetch('/api/bundles'),
      fetch('/api/relationships'),
    ])
    if (
      !thoughtRes.ok ||
      !axesRes.ok ||
      !contextsRes.ok ||
      !bundlesRes.ok ||
      !relationshipRes.ok
    ) {
      throw new Error('Could not load atlas data')
    }
    const thoughtBody = await thoughtRes.json()
    setThoughts(thoughtBody)
    setAxes(await axesRes.json())
    setContexts(await contextsRes.json())
    setBundles(await bundlesRes.json())
    setRelationships(await relationshipRes.json())
    if (!relationship.fromThoughtObjectId && thoughtBody.length > 0) {
      setRelationship({
        fromThoughtObjectId: thoughtBody[0].id,
        toThoughtObjectId: thoughtBody[1]?.id ?? thoughtBody[0].id,
        type: 'echoes',
      })
    }
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function structureThought(thoughtId: string) {
    await runAction(async () => {
      const response = await fetch(`/api/thought-objects/${thoughtId}/structure`, { method: 'POST' })
      if (!response.ok) throw new Error('Could not structure thought-object')
      await loadAll()
    })
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    await runAction(async () => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters: {
            status: 'ready',
            domain: domain || undefined,
            rhetoric: rhetoric || undefined,
          },
        }),
      })
      if (!response.ok) throw new Error('Search failed')
      const body = await response.json()
      setResults(body)
      setSelectedIds(body.slice(0, 3).map((thought: ThoughtObject) => thought.id))
    })
  }

  async function saveContext() {
    await runAction(async () => {
      const response = await fetch('/api/contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: query || `Atlas region ${new Date().toLocaleString()}`,
          query,
          filters: { domain, rhetoric, route: routeName || undefined },
          thoughtObjectIds: selectedIds,
        }),
      })
      if (!response.ok) throw new Error('Could not save context')
      await loadAll()
    })
  }

  async function createRelationship(event: FormEvent) {
    event.preventDefault()
    await runAction(async () => {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationship),
      })
      if (!response.ok) throw new Error('Could not create relationship')
      await loadAll()
    })
  }

  async function generateBundle(contextId?: string) {
    await runAction(async () => {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextId ? { contextId } : { thoughtObjectIds: selectedIds }),
      })
      if (!response.ok) throw new Error('Could not generate bundle')
      await loadAll()
    })
  }

  async function evaluateLatest(event: FormEvent) {
    event.preventDefault()
    const latest = bundles[0]
    if (!latest) return
    await runAction(async () => {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...evaluation, bundleId: latest.id }),
      })
      if (!response.ok) throw new Error('Could not save evaluation')
      setEvaluation({ ...evaluation, notes: '' })
    })
  }

  async function compareTopTwo() {
    if (bundles.length < 2) return
    await runAction(async () => {
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftBundleId: bundles[0].id,
          rightBundleId: bundles[1].id,
          preferredBundleId: bundles[0].id,
          notes: 'Top bundle preferred from atlas workbench.',
        }),
      })
      if (!response.ok) throw new Error('Could not save comparison')
    })
  }

  function toggleSelection(thoughtId: string) {
    setSelectedIds((current) =>
      current.includes(thoughtId)
        ? current.filter((id) => id !== thoughtId)
        : [...current, thoughtId],
    )
  }

  function selectCreativeRoute(route: string) {
    const nextIds = getRouteThoughtIds(route, visibleThoughts, relationships)
    setSelectedIds(nextIds)
    setRouteName(route)
    setQuery(labelForRoute(route))
  }

  return (
    <>
      <Head>
        <title>Memory/Brain - Idea Atlas</title>
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Memory/Brain</p>
            <h1>View the living memory graph</h1>
            <p className="lede">
              Explore how uploaded material becomes a node network of authors, works, passages,
              motifs, tensions, rhetoric, and generated drafts.
            </p>
          </div>
          <nav className="nav">
            <Link href="/upload">Upload Material</Link>
            <Link href="/memory">Memory/Brain</Link>
            <Link href="/generated">Generated Content</Link>
          </nav>
        </header>

        {error && <p className="error">{error}</p>}

        <main className="stack">
          <section className="grid">
            <div className="card stack">
              <h2>Thought-objects</h2>
              {thoughts.length === 0 ? (
                <p className="muted">Create thought-objects from a fragment first.</p>
              ) : (
                <div className="list">
                  {thoughts.map((thought) => (
                    <div className="thoughtCard" key={thought.id}>
                      <div className="sectionHeader">
                        <strong>{thought.status}</strong>
                        <div className="row">
                          <button
                            className="ghostButton"
                            disabled={busy}
                            onClick={() => structureThought(thought.id)}
                            type="button"
                          >
                            Structure
                          </button>
                          <button
                            className="ghostButton"
                            onClick={() => toggleSelection(thought.id)}
                            type="button"
                          >
                            {selectedIds.includes(thought.id) ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                      <p>{thought.rawText}</p>
                      {thought.metadata && (
                        <p className="muted">
                          Domains:{' '}
                          {((thought.metadata.domains as string[] | undefined) ?? []).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form className="card stack" onSubmit={search}>
              <h2>Search and filters</h2>
              <label className="field">
                Semantic query
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="attention + power + skeptical of optimization"
                />
              </label>
              <div className="twoCol">
                <label className="field">
                  Domain
                  <input value={domain} onChange={(event) => setDomain(event.target.value)} />
                </label>
                <label className="field">
                  Rhetoric
                  <input value={rhetoric} onChange={(event) => setRhetoric(event.target.value)} />
                </label>
              </div>
              <button className="button" disabled={busy}>
                Search ready objects
              </button>
              <button
                className="ghostButton"
                disabled={busy || selectedIds.length === 0}
                onClick={saveContext}
                type="button"
              >
                Save selected region
              </button>
              <p className="muted">{selectedIds.length} selected thought-object(s)</p>
            </form>
          </section>

          <section className="grid">
            <form className="card stack" onSubmit={createRelationship}>
              <h2>Relationships</h2>
              <label className="field">
                From
                <select
                  value={relationship.fromThoughtObjectId}
                  onChange={(event) =>
                    setRelationship({ ...relationship, fromThoughtObjectId: event.target.value })
                  }
                >
                  {thoughts.map((thought) => (
                    <option key={thought.id} value={thought.id}>
                      {thought.rawText.slice(0, 70)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Type
                <select
                  value={relationship.type}
                  onChange={(event) => setRelationship({ ...relationship, type: event.target.value })}
                >
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                To
                <select
                  value={relationship.toThoughtObjectId}
                  onChange={(event) =>
                    setRelationship({ ...relationship, toThoughtObjectId: event.target.value })
                  }
                >
                  {thoughts.map((thought) => (
                    <option key={thought.id} value={thought.id}>
                      {thought.rawText.slice(0, 70)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" disabled={busy || thoughts.length < 2}>
                Save relationship
              </button>
            </form>

            <section className="card stack">
              <h2>Saved contexts and generation</h2>
              <button
                className="button"
                disabled={busy || selectedIds.length === 0}
                onClick={() => generateBundle()}
                type="button"
              >
                Generate from selected
              </button>
              {contexts.map((context) => (
                <div className="listItem" key={context.id}>
                  <strong>{context.name}</strong>
                  <span>{context.thoughtObjectIds.length} thought-object(s)</span>
                  <button
                    className="ghostButton"
                    disabled={busy}
                    onClick={() => generateBundle(context.id)}
                    type="button"
                  >
                    Generate from context
                  </button>
                </div>
              ))}
            </section>
          </section>

          <section className="grid">
            <section className="card stack">
              <h2>Generated bundles</h2>
              {bundles.length === 0 ? (
                <p className="muted">No bundles yet.</p>
              ) : (
                bundles.map((bundle) => (
                  <article className="thoughtCard" key={bundle.id}>
                    <p>
                      <strong>Aphorism:</strong> {bundle.aphorism}
                    </p>
                    <p>
                      <strong>Counter:</strong> {bundle.counterAphorism}
                    </p>
                    <p>
                      <strong>Gloss:</strong> {bundle.gloss}
                    </p>
                    <p>
                      <strong>Reversal:</strong> {bundle.reversal}
                    </p>
                    <p>
                      <strong>Hostile reading:</strong> {bundle.hostileReading}
                    </p>
                    <p className="muted">
                      Provenance: {bundle.provenance.map((item) => item.cluster).join(', ')}
                    </p>
                  </article>
                ))
              )}
            </section>

            <form className="card stack" onSubmit={evaluateLatest}>
              <h2>Evaluate latest bundle</h2>
              {(['novelty', 'worldviewFidelity', 'interpretiveDepth', 'quoteLeakageRisk', 'usefulness'] as const).map(
                (field) => (
                  <label className="field" key={field}>
                    {field}
                    <input
                      max={5}
                      min={1}
                      type="number"
                      value={evaluation[field]}
                      onChange={(event) =>
                        setEvaluation({ ...evaluation, [field]: Number(event.target.value) })
                      }
                    />
                  </label>
                ),
              )}
              <label className="field">
                Notes
                <textarea
                  rows={3}
                  value={evaluation.notes}
                  onChange={(event) => setEvaluation({ ...evaluation, notes: event.target.value })}
                />
              </label>
              <button className="button" disabled={busy || bundles.length === 0}>
                Save evaluation
              </button>
              <button
                className="ghostButton"
                disabled={busy || bundles.length < 2}
                onClick={compareTopTwo}
                type="button"
              >
                Prefer latest over previous
              </button>
            </form>
          </section>

          <section className="card stack">
            <div className="sectionHeader">
              <div>
                <h2>Live atlas network</h2>
                <p className="muted">
                  Authors, works, passages, motifs, rhetorical forms, tensions, affects, and
                  generated drafts share one influence graph. Search results redraw this graph live.
                </p>
              </div>
              <div className="graphLegend">
                <span><i className="legendCluster" /> tension</span>
                <span><i className="legendThought" /> passage</span>
                <span><i className="legendLiterary" /> literary node</span>
                <span><i className="legendStored" /> stored edge</span>
              </div>
            </div>
            <div className="selectionBar">
              <div className="sourceChips">
                {creativeRoutes.map((route) => (
                  <button
                    className="ghostButton"
                    disabled={visibleThoughts.length === 0}
                    key={route}
                    onClick={() => selectCreativeRoute(route)}
                    type="button"
                  >
                    {labelForRoute(route)}
                  </button>
                ))}
              </div>
              <p className="muted">
                {routeName ? `${labelForRoute(routeName)} selected` : 'Select a creative route'}
              </p>
            </div>
            <div className="atlasGraphShell">
              {graph.nodes.length === 0 ? (
                <p className="muted">No atlas nodes yet. Create and structure thought-objects first.</p>
              ) : (
                <svg
                  aria-label="Live atlas node network"
                  className="atlasGraph"
                  role="img"
                  viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                >
                  <defs>
                    <marker
                      id="relationshipArrow"
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="8"
                      refY="4"
                    >
                      <path d="M0,0 L8,4 L0,8 Z" />
                    </marker>
                  </defs>
                  {graph.edges.map((edge) => {
                    const source = graph.nodeMap.get(edge.source)
                    const target = graph.nodeMap.get(edge.target)
                    if (!source || !target) return null
                    return (
                      <g key={edge.id}>
                        <line
                          className={`graphEdge graphEdge-${edge.storage}`}
                          markerEnd={edge.storage === 'relationship' ? 'url(#relationshipArrow)' : undefined}
                          x1={source.x}
                          x2={target.x}
                          y1={source.y}
                          y2={target.y}
                        />
                        {(edge.storage === 'relationship' || edge.storage === 'literary') && (
                          <text
                            className="graphEdgeLabel"
                            x={(source.x + target.x) / 2}
                            y={(source.y + target.y) / 2 - 6}
                          >
                            {edge.type}
                          </text>
                        )}
                      </g>
                    )
                  })}
                  {graph.nodes.map((node) => (
                    <g
                      className={`graphNode graphNode-${node.type} ${
                        node.thought && selectedIds.includes(node.thought.id) ? 'graphNodeSelected' : ''
                      }`}
                      key={node.id}
                      onClick={() => node.thought && toggleSelection(node.thought.id)}
                      role={node.thought ? 'button' : 'img'}
                      tabIndex={node.thought ? 0 : -1}
                    >
                      <title>
                        {node.thought ? `${node.label}: ${node.thought.rawText}` : `${node.label} ${node.type}`}
                      </title>
                      <circle cx={node.x} cy={node.y} r={node.type === 'tension' ? 34 : node.type === 'passage' ? 22 : 18} />
                      <text x={node.x} y={node.y + (node.type === 'tension' ? 4 : 40)}>
                        {node.label}
                      </text>
                      {node.status && (
                        <text className="graphStatus" x={node.x} y={node.y + 58}>
                          {node.status}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              )}
            </div>
            <div className="clusterGrid">
              {Object.entries(clusters).map(([cluster, items]) => (
                <div className="thoughtCard" key={cluster}>
                  <h3>{cluster}</h3>
                  <p className="muted">
                    {items.length} node(s)
                    {items.length === 1 ? ' — outlier' : items.length === 2 ? ' — border zone' : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

function getThoughtCluster(thought: ThoughtObject) {
  return thought.cluster || ((thought.metadata?.domains as string[] | undefined)?.[0] ?? thought.status ?? 'raw')
}

function buildNetworkGraph(thoughts: ThoughtObject[], relationships: Relationship[], bundles: Bundle[]) {
  const clusters = thoughts.reduce<Record<string, ThoughtObject[]>>((groups, thought) => {
    const cluster = getThoughtCluster(thought)
    groups[cluster] = [...(groups[cluster] ?? []), thought]
    return groups
  }, {})
  const clusterEntries = Object.entries(clusters)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  const centerX = graphWidth / 2
  const centerY = graphHeight / 2
  const clusterRadius = clusterEntries.length <= 1 ? 0 : 210

  function addNode(node: GraphNode) {
    if (nodeIds.has(node.id)) return
    nodeIds.add(node.id)
    nodes.push(node)
  }

  function addLiteraryNode(type: GraphNode['type'], label: string, cluster: string) {
    const id = nodeId(type, label)
    if (!nodeIds.has(id)) {
      const angle = ((hash(id) % 360) / 180) * Math.PI
      const radius = 280 + (hash(`${id}:radius`) % 70)
      addNode({
        id,
        label: shortNodeLabel(label),
        type,
        x: clamp(centerX + Math.cos(angle) * radius, 44, graphWidth - 44),
        y: clamp(centerY + Math.sin(angle) * radius, 60, graphHeight - 60),
        cluster,
      })
    }
    return id
  }

  clusterEntries.forEach(([cluster, clusterThoughts], clusterIndex) => {
    const clusterAngle = (Math.PI * 2 * clusterIndex) / clusterEntries.length - Math.PI / 2
    const clusterX = centerX + Math.cos(clusterAngle) * clusterRadius
    const clusterY = centerY + Math.sin(clusterAngle) * clusterRadius
    const clusterId = nodeId('tension', cluster)

    addNode({
      id: clusterId,
      label: cluster,
      type: 'tension',
      x: clusterX,
      y: clusterY,
      cluster,
    })

    clusterThoughts.forEach((thought, thoughtIndex) => {
      const thoughtAngle = (Math.PI * 2 * thoughtIndex) / Math.max(clusterThoughts.length, 1)
      const orbit = clusterThoughts.length === 1 ? 82 : 92 + Math.min(clusterThoughts.length, 5) * 4
      const thoughtNodeId = nodeId('passage', thought.id)
      const x = clusterX + Math.cos(thoughtAngle) * orbit
      const y = clusterY + Math.sin(thoughtAngle) * orbit
      const source = thought.sourceFragment
      const inferred = (source?.inferredMetadata ?? {}) as Record<string, unknown>

      addNode({
        id: thoughtNodeId,
        label: shortNodeLabel(thought.rawText),
        type: 'passage',
        x: clamp(x, 58, graphWidth - 58),
        y: clamp(y, 70, graphHeight - 70),
        cluster,
        status: source?.canonRelationship ?? thought.status,
        thought,
      })
      edges.push({
        id: `stored:${cluster}:${thought.id}`,
        source: clusterId,
        target: thoughtNodeId,
        type: 'stored_in',
        storage: 'cluster',
      })

      const workLabel = source?.title || stringValue(inferred.title) || source?.fragmentType
      if (workLabel) {
        const workNodeId = addLiteraryNode('work', workLabel, cluster)
        edges.push({
          id: `work:${source?.id ?? thought.id}:${thought.id}`,
          source: workNodeId,
          target: thoughtNodeId,
          type: 'contains',
          storage: 'literary',
        })
      }

      const authorLabel = source?.author || stringValue(inferred.author) || sourceHintAuthor(inferred)
      if (authorLabel) {
        const authorNodeId = addLiteraryNode('author', authorLabel, cluster)
        edges.push({
          id: `author:${authorLabel}:${source?.id ?? thought.id}`,
          source: authorNodeId,
          target: workLabel ? nodeId('work', workLabel) : thoughtNodeId,
          type: 'descends_from',
          storage: 'literary',
        })
      }

      const motifs = arrayValue(inferred.motifs).length
        ? arrayValue(inferred.motifs)
        : ((thought.metadata?.imagery as string[] | undefined) ?? [])
      motifs.slice(0, 3).forEach((motif) => {
        const motifNodeId = addLiteraryNode('motif', motif, cluster)
        edges.push({
          id: `motif:${thought.id}:${motif}`,
          source: thoughtNodeId,
          target: motifNodeId,
          type: 'shares_image_system',
          storage: 'literary',
        })
      })

      const rhetoric = arrayValue(inferred.rhetoric).length
        ? arrayValue(inferred.rhetoric)
        : ((thought.metadata?.rhetoric as string[] | undefined) ?? [])
      rhetoric.slice(0, 2).forEach((form) => {
        const rhetoricNodeId = addLiteraryNode('rhetoric', form, cluster)
        edges.push({
          id: `rhetoric:${thought.id}:${form}`,
          source: thoughtNodeId,
          target: rhetoricNodeId,
          type: 'shares_rhetorical_form',
          storage: 'literary',
        })
      })

      const affect = stringValue(inferred.affectiveRegister) || stringValue(thought.metadata?.emotionalValence)
      if (affect) {
        const affectNodeId = addLiteraryNode('affect', affect, cluster)
        edges.push({
          id: `affect:${thought.id}:${affect}`,
          source: thoughtNodeId,
          target: affectNodeId,
          type: 'carries_register',
          storage: 'literary',
        })
      }
    })
  })

  const visibleThoughtIds = new Set(thoughts.map((thought) => thought.id))
  relationships
    .filter(
      (relationship) =>
        visibleThoughtIds.has(relationship.fromThoughtObjectId) &&
        visibleThoughtIds.has(relationship.toThoughtObjectId),
    )
    .forEach((relationship) => {
      edges.push({
        id: `relationship:${relationship.id}`,
        source: nodeId('passage', relationship.fromThoughtObjectId),
        target: nodeId('passage', relationship.toThoughtObjectId),
        type: relationship.type,
        storage: 'relationship',
      })
    })

  bundles.slice(0, 5).forEach((bundle, index) => {
    const draftNodeId = nodeId('draft', bundle.id)
    addNode({
      id: draftNodeId,
      label: `draft ${index + 1}`,
      type: 'draft',
      x: clamp(120 + index * 180, 60, graphWidth - 60),
      y: graphHeight - 58,
      cluster: 'generated draft',
      bundle,
    })
    bundle.provenance.forEach((item) => {
      if (!visibleThoughtIds.has(item.thoughtObjectId)) return
      edges.push({
        id: `generated:${item.thoughtObjectId}:${bundle.id}`,
        source: nodeId('passage', item.thoughtObjectId),
        target: draftNodeId,
        type: 'generated',
        storage: 'generation',
      })
    })
  })

  return {
    nodes,
    edges,
    nodeMap: new Map(nodes.map((node) => [node.id, node])),
  }
}

function shortNodeLabel(rawText: string) {
  const words = rawText.replace(/\s+/g, ' ').trim().split(' ')
  return words.slice(0, 4).join(' ') || 'thought'
}

function getRouteThoughtIds(route: string, thoughts: ThoughtObject[], relationships: Relationship[]) {
  const clusters = thoughts.reduce<Record<string, ThoughtObject[]>>((groups, thought) => {
    const cluster = getThoughtCluster(thought)
    groups[cluster] = [...(groups[cluster] ?? []), thought]
    return groups
  }, {})
  const clusterEntries = Object.entries(clusters).sort(([, left], [, right]) => right.length - left.length)

  if (route === 'core_cluster') return clusterEntries[0]?.[1].map((thought) => thought.id) ?? []
  if (route === 'distant_analogue') return clusterEntries.map(([, items]) => items[0]?.id).filter(Boolean)
  if (route === 'border_zone') {
    return clusterEntries
      .filter(([, items]) => items.length <= 2)
      .flatMap(([, items]) => items.map((thought) => thought.id))
      .slice(0, 8)
  }
  if (route === 'unresolved_tension') {
    const relationshipIds = relationships
      .filter((relationship) => ['rebuts', 'inverts', 'parodies'].includes(relationship.type))
      .flatMap((relationship) => [relationship.fromThoughtObjectId, relationship.toThoughtObjectId])
    const relationshipSet = new Set(relationshipIds)
    return thoughts
      .filter(
        (thought) =>
          relationshipSet.has(thought.id) ||
          ['unresolved', 'resisted', 'guilty_influence'].includes(thought.sourceFragment?.canonRelationship ?? ''),
      )
      .map((thought) => thought.id)
      .slice(0, 8)
  }
  if (route === 'adjacent_contradiction') {
    return thoughts
      .filter((thought) => {
        const metadata = thought.metadata ?? {}
        const rhetoric = (metadata.rhetoric as string[] | undefined) ?? []
        return rhetoric.includes('contrast') || metadata.stance === 'skeptical'
      })
      .map((thought) => thought.id)
      .slice(0, 8)
  }

  return []
}

function labelForRoute(route: string) {
  return route.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function nodeId(type: string, value: string) {
  return `${type}:${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function sourceHintAuthor(metadata: Record<string, unknown>) {
  const sourceHints = stringValue(metadata.sourceHints)
  const byline = sourceHints?.match(/^by\s+(.+)/i)
  return byline?.[1]
}

function hash(input: string) {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return Math.abs(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
