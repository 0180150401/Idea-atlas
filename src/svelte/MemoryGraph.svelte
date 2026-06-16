<svelte:options customElement="memory-graph" />

<script>
  export let dataJson = '{"thoughts":[],"relationships":[]}'

  $: data = parseData(dataJson)
  $: graph = buildGraph(data.thoughts, data.relationships)
  let selectedId = ''
  $: selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0]
  $: selectedEdges = graph.edges.filter(
    (edge) => edge.fromThoughtObjectId === selectedId || edge.toThoughtObjectId === selectedId,
  )

  function parseData(value) {
    try {
      const parsed = JSON.parse(value || '{}')
      return {
        thoughts: Array.isArray(parsed.thoughts) ? parsed.thoughts : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      }
    } catch {
      return { thoughts: [], relationships: [] }
    }
  }

  function buildGraph(thoughts, relationships) {
    const width = 1120
    const height = 650
    const centerX = width / 2
    const centerY = height / 2
    const nodes = thoughts.map((thought, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(thoughts.length, 1) - Math.PI / 2
      const radius = 190 + (index % 4) * 42
      const metadata = thought.sourceFragment?.inferredMetadata || thought.metadata || {}
      return {
        id: thought.id,
        label: shortLabel(thought.sourceFragment?.title || metadata.title || thought.rawText),
        preview: thought.rawText,
        type: thought.sourceFragment?.fragmentType || 'memory',
        metadata,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      }
    })
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = relationships.filter(
      (edge) => nodeIds.has(edge.fromThoughtObjectId) && nodeIds.has(edge.toThoughtObjectId),
    )
    return { width, height, centerX, centerY, nodes, edges }
  }

  function shortLabel(value) {
    return String(value || 'memory')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 4)
      .join(' ')
  }

  function formatMetadata(metadata) {
    const entries = Object.entries(metadata || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .slice(0, 8)
    if (entries.length === 0) return [['status', 'metadata inferred from upload']]
    return entries.map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])
  }
</script>

<div class="memoryShell">
  <section class="networkPanel">
    {#if graph.nodes.length === 0}
      <div class="emptyState">
        <h2>No memory nodes yet</h2>
        <p>Upload material first. The graph will appear here automatically.</p>
      </div>
    {:else}
      <svg aria-label="Memory brain node network" viewBox="0 0 {graph.width} {graph.height}">
        <defs>
          <radialGradient id="nodeGlow">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle class="core" cx={graph.centerX} cy={graph.centerY} r="76" />
        <text class="coreText" x={graph.centerX} y={graph.centerY + 4}>memory / brain</text>

        {#each graph.nodes as node}
          <line class="memoryEdge" x1={graph.centerX} y1={graph.centerY} x2={node.x} y2={node.y} />
        {/each}

        {#each graph.edges as edge}
          {@const source = graph.nodes.find((node) => node.id === edge.fromThoughtObjectId)}
          {@const target = graph.nodes.find((node) => node.id === edge.toThoughtObjectId)}
          {#if source && target}
            <line
              class="relationshipEdge {edge.lifecycleState || 'suggested'}"
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
            />
          {/if}
        {/each}

        {#each graph.nodes as node}
          <g
            class:selected={selected?.id === node.id}
            class="memoryNode"
            on:click={() => (selectedId = node.id)}
            on:keydown={(event) => event.key === 'Enter' && (selectedId = node.id)}
            role="button"
            tabindex="0"
          >
            <circle class="halo" cx={node.x} cy={node.y} r="42" />
            <circle cx={node.x} cy={node.y} r="24" />
            <text x={node.x} y={node.y + 44}>{node.label}</text>
          </g>
        {/each}
      </svg>
    {/if}
  </section>

  <aside class="previewPanel">
    <p class="eyebrow">Material Preview</p>
    {#if selected}
      <h2>{selected.label}</h2>
      <p class="typePill">{selected.type}</p>
      <pre>{selected.preview}</pre>
      <div class="metadata">
        {#each formatMetadata(selected.metadata) as [key, value]}
          <p><strong>{key}</strong> {value}</p>
        {/each}
      </div>
      {#if selectedEdges.length > 0}
        <div class="metadata">
          <p><strong>relationships</strong></p>
          {#each selectedEdges as edge}
            <p>
              <strong>{edge.type}</strong> ({edge.lifecycleState || 'suggested'}, conf{' '}
              {edge.confidence ?? 'n/a'}): {edge.evidence || 'inferred connection'}
            </p>
          {/each}
        </div>
      {/if}
    {:else}
      <h2>Select a node</h2>
      <p>Click through the network to preview uploaded material and inferred metadata.</p>
    {/if}
  </aside>
</div>

<style>
  :host {
    display: block;
    color: #201a15;
    font-family: Arial, Helvetica, sans-serif;
  }

  .memoryShell {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  }

  .networkPanel,
  .previewPanel {
    background: #fffaf2;
    border: 1px solid #ded4c8;
    border-radius: 24px;
    min-height: 680px;
    overflow: hidden;
  }

  .networkPanel {
    background:
      radial-gradient(circle at 50% 45%, rgba(75, 56, 41, 0.12), transparent 48%),
      #f7f2ea;
  }

  svg {
    display: block;
    height: 680px;
    width: 100%;
  }

  .core {
    fill: rgba(75, 56, 41, 0.16);
    stroke: #4b3829;
    stroke-width: 2;
  }

  .coreText,
  .memoryNode text {
    fill: #201a15;
    font-size: 13px;
    font-weight: 700;
    paint-order: stroke;
    pointer-events: none;
    stroke: #f7f2ea;
    stroke-width: 5px;
    text-anchor: middle;
  }

  .memoryEdge {
    stroke: rgba(117, 107, 98, 0.35);
    stroke-dasharray: 6 10;
    stroke-width: 1.4;
  }

  .relationshipEdge {
    stroke: rgba(75, 56, 41, 0.68);
    stroke-width: 2.2;
  }

  .relationshipEdge.confirmed {
    stroke: rgba(34, 94, 58, 0.82);
  }

  .relationshipEdge.rejected {
    stroke: rgba(140, 58, 58, 0.45);
    stroke-dasharray: 4 8;
  }

  .relationshipEdge.derived {
    stroke: rgba(117, 107, 98, 0.55);
    stroke-dasharray: 2 6;
  }

  .memoryNode {
    cursor: pointer;
    outline: none;
  }

  .memoryNode .halo {
    fill: url(#nodeGlow);
    color: #4b3829;
  }

  .memoryNode circle:not(.halo) {
    fill: #fffaf2;
    stroke: #ded4c8;
    stroke-width: 2;
    transition:
      fill 0.18s,
      r 0.18s,
      stroke-width 0.18s;
  }

  .memoryNode:hover circle:not(.halo),
  .memoryNode:focus circle:not(.halo),
  .memoryNode.selected circle:not(.halo) {
    fill: #ead8c3;
    stroke: #4b3829;
    stroke-width: 4;
  }

  .previewPanel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 24px;
  }

  .eyebrow {
    color: #756b62;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h2 {
    font-size: 24px;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0;
  }

  .typePill {
    align-self: flex-start;
    background: #f7f2ea;
    border: 1px solid #ded4c8;
    border-radius: 999px;
    color: #756b62;
    font-size: 12px;
    padding: 7px 10px;
  }

  pre {
    background: #f7f2ea;
    border: 1px solid #ded4c8;
    border-radius: 16px;
    color: #201a15;
    line-height: 1.55;
    max-height: 320px;
    overflow: auto;
    padding: 14px;
    white-space: pre-wrap;
  }

  .metadata {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metadata p,
  .emptyState p {
    color: #756b62;
    line-height: 1.5;
    margin: 0;
  }

  .metadata strong {
    color: #201a15;
    display: block;
    font-size: 12px;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
    text-transform: uppercase;
  }

  .emptyState {
    align-items: center;
    display: flex;
    flex-direction: column;
    height: 680px;
    justify-content: center;
    padding: 24px;
    text-align: center;
  }

  @media (max-width: 900px) {
    .memoryShell {
      grid-template-columns: 1fr;
    }
  }
</style>
