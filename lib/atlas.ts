export type ThoughtMetadata = {
  domains: string[]
  claimType: string
  stance: string
  target: string
  rhetoric: string[]
  imagery: string[]
  metaphorFamily: string
  emotionalValence: string
}

type Axis = {
  id: string
  name: string
  minLabel: string
  maxLabel: string
}

const domainKeywords: Record<string, string[]> = {
  attention: ['attention', 'focus', 'notice', 'signal', 'lens', 'visibility'],
  power: ['power', 'control', 'leash', 'govern', 'force', 'authority'],
  measurement: ['metric', 'measure', 'score', 'optimize', 'data', 'count'],
  meaning: ['meaning', 'moral', 'value', 'truth', 'soul', 'purpose'],
  creativity: ['create', 'invent', 'atlas', 'blend', 'metaphor', 'image'],
  time: ['speed', 'depth', 'slow', 'fast', 'duration', 'moment'],
}

export function extractMetadata(rawText: string): ThoughtMetadata {
  const lower = rawText.toLowerCase()
  const domains = Object.entries(domainKeywords)
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([domain]) => domain)

  const rhetoric = [
    lower.includes(' but ') || lower.includes(' yet ') ? 'contrast' : '',
    rawText.includes(';') || rawText.includes(':') ? 'parallelism' : '',
    /\b(\w+)\b.*\b\1\b/i.test(rawText) ? 'repetition' : '',
    lower.includes('as ') || lower.includes('like ') ? 'metaphor' : '',
    rawText.length < 160 ? 'compression' : '',
  ].filter(Boolean)

  const imagery = Array.from(
    new Set(
      rawText
        .split(/[^A-Za-z]+/)
        .filter((word) => word.length > 4)
        .slice(0, 8)
        .map((word) => word.toLowerCase()),
    ),
  )

  return {
    domains: domains.length ? domains : ['general'],
    claimType: lower.includes('?')
      ? 'question'
      : lower.includes('should') || lower.includes('must')
        ? 'normative'
        : 'observation',
    stance: lower.includes('not') || lower.includes('never') ? 'skeptical' : 'exploratory',
    target: domains[0] ?? 'general thought',
    rhetoric: rhetoric.length ? rhetoric : ['plain statement'],
    imagery,
    metaphorFamily: lower.includes('lens') || lower.includes('light') ? 'visibility' : 'conceptual',
    emotionalValence:
      lower.includes('risk') || lower.includes('leash') || lower.includes('warning')
        ? 'cautionary'
        : 'neutral',
  }
}

export function worldviewCoordinates(rawText: string, axes: Axis[]) {
  const lower = rawText.toLowerCase()
  return Object.fromEntries(
    axes.map((axis, index) => {
      const minHit = lower.includes(axis.minLabel.toLowerCase()) ? -0.75 : 0
      const maxHit = lower.includes(axis.maxLabel.toLowerCase()) ? 0.75 : 0
      const fallback = ((hash(`${axis.name}:${rawText}`) % 200) - 100) / 250
      return [axis.id, Number((minHit + maxHit || fallback + index * 0.03).toFixed(3))]
    }),
  )
}

export function embedText(rawText: string) {
  const buckets = new Array(8).fill(0)
  const words = rawText.toLowerCase().match(/[a-z0-9]+/g) ?? []

  for (const word of words) {
    buckets[hash(word) % buckets.length] += 1
  }

  const magnitude = Math.sqrt(buckets.reduce((sum, value) => sum + value * value, 0)) || 1
  return buckets.map((value) => Number((value / magnitude).toFixed(6)))
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0)
  const aMag = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0)) || 1
  const bMag = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0)) || 1
  return dot / (aMag * bMag)
}

export function parseEmbedding(value: unknown) {
  if (Array.isArray(value)) return value.map(Number)
  if (typeof value === 'string') {
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item))
  }
  return []
}

export function clusterLabel(rawText: string, metadata: unknown) {
  const domains = (metadata as ThoughtMetadata | null)?.domains
  if (Array.isArray(domains) && domains.length > 0) return domains[0]
  return extractMetadata(rawText).domains[0]
}

export function draftBundle(
  thoughts: Array<{ id: string; rawText: string; metadata: unknown }>,
  options: {
    outputMode?: string
    formalConstraint?: string
    revisionDirection?: string
    evaluationGuidance?: string
  } = {},
) {
  const primary = thoughts[0]
  const contrast = thoughts[1] ?? thoughts[0]
  const primaryImage = extractMetadata(primary?.rawText ?? '').imagery[0] ?? 'idea'
  const contrastImage = extractMetadata(contrast?.rawText ?? '').imagery[0] ?? 'shadow'
  const mode = options.outputMode || 'aphorism bundle'
  const constraint = options.formalConstraint || 'paradox'
  const revision = options.revisionDirection || 'first pass'
  const guidance = options.evaluationGuidance || 'no prior evaluation guidance'

  return {
    aphorism: `A ${primaryImage} becomes an atlas when ${constraint} gives it a necessary wound.`,
    counterAphorism: `Not every ${constraint} is wisdom; some are only the edge of habit wearing a mask.`,
    gloss: `This ${mode} draws from ${thoughts.length} thought-object${
      thoughts.length === 1 ? '' : 's'
    }, using ${constraint} as its formal pressure and ${revision} as its revision direction. Prior evaluation guidance: ${guidance}.`,
    reversal: `If the atlas becomes too orderly, the ${contrastImage} it was meant to reveal disappears.`,
    hostileReading:
      'The draft may over-romanticize structure: a map can clarify thought, but it can also freeze living ambiguity into categories too early.',
    provenance: thoughts.map((thought) => ({
      thoughtObjectId: thought.id,
      excerpt: thought.rawText.slice(0, 240),
      cluster: clusterLabel(thought.rawText, thought.metadata),
      influenceWeight: Number((1 / Math.max(thoughts.length, 1)).toFixed(2)),
      formalConstraint: constraint,
      outputMode: mode,
      centralTension: `${primaryImage} / ${contrastImage}`,
      transformedRatherThanCopied: 'Uses source imagery and stance as pressure, not verbatim continuation.',
      evaluationGuidance: guidance,
    })),
  }
}

export function mediaKind(mimeType = '', fileName = '') {
  const lowerName = fileName.toLowerCase()
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('text/') || lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
    return 'text'
  }
  if (
    mimeType.includes('pdf') ||
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx')
  ) {
    return 'document'
  }
  return 'other'
}

export function enrichMediaMetadata(input: {
  fileName?: string
  mimeType?: string
  sizeBytes?: number
  extractedText?: string
  clientMetadata?: Record<string, unknown>
}) {
  const kind = mediaKind(input.mimeType, input.fileName)
  const words = input.extractedText?.match(/\S+/g)?.length ?? 0
  const textMetadata = input.extractedText ? extractMetadata(input.extractedText) : undefined
  const inferredTitle = inferMediaTitle(input.fileName, input.extractedText, kind)
  const keywords = extractKeywords(input.extractedText || input.fileName || kind)
  const extension = input.fileName?.includes('.') ? input.fileName.split('.').pop() : undefined
  const sizeBucket =
    typeof input.sizeBytes !== 'number'
      ? 'unknown'
      : input.sizeBytes < 100_000
        ? 'small'
        : input.sizeBytes < 2_000_000
          ? 'medium'
          : 'large'

  return {
    kind,
    extension,
    sizeBucket,
    wordCount: words,
    hasExtractedText: Boolean(input.extractedText),
    extractionMode: kind === 'text' ? 'full-text' : 'file-metadata',
    inferredTitle,
    keywords,
    domains: textMetadata?.domains ?? inferDomainsFromName(input.fileName, kind),
    rhetoric: textMetadata?.rhetoric ?? [],
    imagery: textMetadata?.imagery ?? keywords.slice(0, 5),
    suggestedPrompt: buildAutoPrompt({
      title: inferredTitle,
      kind,
      domains: textMetadata?.domains ?? inferDomainsFromName(input.fileName, kind),
      keywords,
    }),
    ...(input.clientMetadata ?? {}),
  }
}

export function autoIterationPrompt(input: {
  mediaItems: Array<{ kind: string; fileName: string | null; metadata: Record<string, unknown> }>
  thoughts: Array<{ rawText: string; metadata: unknown }>
}) {
  const mediaTitles = input.mediaItems
    .map((item) => String(item.metadata.inferredTitle || item.fileName || item.kind))
    .slice(0, 3)
  const thoughtDomains = input.thoughts
    .flatMap((thought) => (thought.metadata as ThoughtMetadata | null)?.domains ?? [])
    .slice(0, 3)
  const domains = Array.from(
    new Set([
      ...input.mediaItems.flatMap((item) =>
        Array.isArray(item.metadata.domains) ? item.metadata.domains.map(String) : [],
      ),
      ...thoughtDomains,
    ]),
  )

  return buildAutoPrompt({
    title: mediaTitles.join(' + ') || 'selected atlas material',
    kind: input.mediaItems.map((item) => item.kind).join(', ') || 'atlas',
    domains: domains.length ? domains : ['general'],
    keywords: input.mediaItems.flatMap((item) =>
      Array.isArray(item.metadata.keywords) ? item.metadata.keywords.map(String) : [],
    ),
  })
}

export function draftIteration(input: {
  prompt: string
  mediaItems: Array<{
    kind: string
    fileName: string | null
    extractedText: string | null
    metadata: Record<string, unknown>
  }>
  thoughts: Array<{ rawText: string; metadata: unknown }>
  previousDraft?: string
  direction?: string
}) {
  const mediaSignals = input.mediaItems.map((item) => {
    const label = item.fileName || `${item.kind} item`
    const text = item.extractedText?.slice(0, 180)
    return text ? `${label}: ${text}` : `${label}: ${JSON.stringify(item.metadata).slice(0, 180)}`
  })
  const thoughtSignals = input.thoughts.map((thought) => thought.rawText.slice(0, 180))
  const dominantImage =
    input.thoughts
      .flatMap((thought) => extractMetadata(thought.rawText).imagery)
      .find(Boolean) ||
    input.mediaItems[0]?.fileName?.split('.')[0] ||
    'threshold'

  const prior = input.previousDraft
    ? `\n\nPrevious draft pressure:\n${input.previousDraft.slice(0, 500)}`
    : ''
  const direction = input.direction ? `\n\nIteration direction: ${input.direction}` : ''

  return [
    `# ${input.prompt || 'Liminal atlas draft'}`,
    '',
    `A ${dominantImage} is not an object here; it is a hinge. The atlas gathers the media as evidence, then asks what hidden tension each piece is carrying.`,
    '',
    '## Source Signals',
    ...mediaSignals.map((signal) => `- ${signal}`),
    ...thoughtSignals.map((signal) => `- ${signal}`),
    '',
    '## New Synthesis',
    `The novel move is to treat the dropped material as a threshold: not content to summarize, but pressure to transform. The draft should preserve the contradiction between what the media shows, what the notes claim, and what the worldview axes make difficult to ignore.`,
    '',
    '## Aphoristic Core',
    `An archive becomes alive when its fragments start arguing with the image that summoned them.`,
    prior,
    direction,
  ]
    .filter(Boolean)
    .join('\n')
}

export function inferCanonMetadata(rawText: string, fragmentType = 'pasted-text') {
  const lower = rawText.toLowerCase()
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const firstLine = lines[0]
  const extracted = extractMetadata(rawText)
  const enriched = enrichMediaMetadata({ extractedText: rawText })

  const genreMarkers: Record<string, string[]> = {
    aphorism: ['aphorism', 'maxim', 'proverb', 'one must', 'never ', 'always '],
    essay: ['essay', 'argue', 'contend', 'question is', 'therefore', 'because'],
    manifesto: ['manifesto', 'we demand', 'we declare', 'it is time', 'against'],
    lyric: ['i feel', 'i saw', 'i hear', 'song', 'silence', 'night'],
    marginalia: ['margin', 'underline', 'note:', 'cf.', 'see also'],
    draft: ['draft', 'todo', 'revise', 'unfinished', 'sketch'],
  }

  const motifMarkers: Record<string, string[]> = {
    light: ['light', 'shadow', 'visibility', 'radiant', 'dark'],
    threshold: ['threshold', 'door', 'gate', 'border', 'edge'],
    body: ['body', 'hand', 'blood', 'breath', 'skin'],
    machine: ['machine', 'signal', 'system', 'metric', 'engine'],
    pilgrimage: ['path', 'road', 'return', 'exile', 'arrival'],
    ruin: ['ruin', 'decay', 'ash', 'collapse', 'wreck'],
  }

  const affectiveRegister = inferAffectiveRegister(lower)
  const title = firstLine && firstLine.length <= 120 ? firstLine : undefined
  const sourceHints = inferSourceHints(lines)
  const genreForm = findFirstMarker(lower, genreMarkers) ?? fragmentType
  const motifs = findAllMarkers(lower, motifMarkers)
  const quoteLeak = /["“][^"”]{40,}["”]/.test(rawText) ? 'possible-verbatim-quote' : 'low'

  return {
    ...(title && { title }),
    ...(sourceHints && { sourceHints }),
    genreForm,
    keywords: enriched.keywords,
    motifs,
    domains: extracted.domains,
    rhetoric: extracted.rhetoric,
    affectiveRegister,
    provenance: `Inferred from ${fragmentType} text using local canon heuristics.`,
    quoteLeak,
  }
}

function hash(input: string) {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return Math.abs(value)
}

function findFirstMarker(text: string, markerMap: Record<string, string[]>) {
  return Object.entries(markerMap).find(([, markers]) => markers.some((marker) => text.includes(marker)))?.[0]
}

function findAllMarkers(text: string, markerMap: Record<string, string[]>) {
  return Object.entries(markerMap)
    .filter(([, markers]) => markers.some((marker) => text.includes(marker)))
    .map(([label]) => label)
    .slice(0, 6)
}

function inferAffectiveRegister(text: string) {
  const registers: Record<string, string[]> = {
    ecstatic: ['joy', 'wonder', 'beauty', 'sublime', 'radiant', 'rapture'],
    elegiac: ['grief', 'death', 'loss', 'ruin', 'mourning', 'vanished'],
    adversarial: ['against', 'refuse', 'resist', 'hostile', 'enemy', 'rebuke'],
    anxious: ['dread', 'fear', 'risk', 'fragile', 'warning', 'uncertain'],
    contemplative: ['silence', 'attention', 'stillness', 'depth', 'meditation', 'meaning'],
  }
  return findFirstMarker(text, registers) ?? 'neutral'
}

function inferSourceHints(lines: string[]) {
  const byline = lines.find((line) => /^by\s+\w+/i.test(line))
  if (byline) return byline
  const citationLike = lines.find((line) => /\b(chapter|page|pp\.|vol\.|book)\b/i.test(line))
  return citationLike
}

function inferMediaTitle(fileName = '', extractedText = '', kind = 'media') {
  const firstLine = extractedText
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (firstLine) return firstLine.slice(0, 90)
  if (fileName) return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return `${kind} drop`
}

function extractKeywords(text: string) {
  const stopWords = new Set([
    'this',
    'that',
    'with',
    'from',
    'into',
    'when',
    'what',
    'where',
    'which',
    'their',
    'there',
    'becomes',
  ])

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((word) => word.length > 3 && !stopWords.has(word))
        .slice(0, 12) ?? [],
    ),
  )
}

function inferDomainsFromName(fileName = '', kind = 'media') {
  const lower = `${fileName} ${kind}`.toLowerCase()
  const domains = Object.entries(domainKeywords)
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([domain]) => domain)
  return domains.length ? domains : [kind === 'image' ? 'imagery' : kind]
}

function buildAutoPrompt(input: {
  title: string
  kind: string
  domains: string[]
  keywords: string[]
}) {
  const domains = input.domains.slice(0, 4).join(', ')
  const keywords = input.keywords.slice(0, 6).join(', ')
  return `Generate novel liminal atlas material from ${input.kind} "${input.title}"${
    domains ? ` across ${domains}` : ''
  }${keywords ? `, using signals like ${keywords}` : ''}.`
}
