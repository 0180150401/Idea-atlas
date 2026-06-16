import Head from 'next/head'
import Link from 'next/link'
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'

type MediaItem = {
  id: string
  kind: string
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  dataUrl: string | null
  extractedText: string | null
  metadata: Record<string, unknown>
}

type ThoughtObject = {
  id: string
  rawText: string
  status: string
  metadata: Record<string, unknown> | null
}

type IterationSession = {
  id: string
  title: string
  prompt: string
  mediaItemIds: string[]
  thoughtObjectIds: string[]
  currentDraft: string
  history: Array<Record<string, unknown>>
}

export default function StudioPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [thoughts, setThoughts] = useState<ThoughtObject[]>([])
  const [sessions, setSessions] = useState<IterationSession[]>([])
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([])
  const [selectedThoughtIds, setSelectedThoughtIds] = useState<string[]>([])
  const [droppedText, setDroppedText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [direction, setDirection] = useState('make it stranger and more image-driven')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const latestSession = sessions[0]
  const selectedMedia = useMemo(
    () => mediaItems.filter((item) => selectedMediaIds.includes(item.id)),
    [mediaItems, selectedMediaIds],
  )
  const autoPrompt = useMemo(
    () => inferClientPrompt(selectedMedia, thoughts.filter((thought) => selectedThoughtIds.includes(thought.id))),
    [selectedMedia, selectedThoughtIds, thoughts],
  )

  async function loadAll() {
    const [mediaRes, thoughtRes, sessionRes] = await Promise.all([
      fetch('/api/media-items'),
      fetch('/api/thought-objects'),
      fetch('/api/iterations'),
    ])
    if (!mediaRes.ok || !thoughtRes.ok || !sessionRes.ok) {
      throw new Error('Could not load studio data')
    }
    setMediaItems(await mediaRes.json())
    setThoughts(await thoughtRes.json())
    setSessions(await sessionRes.json())
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message))
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

  async function storeMediaItem(input: {
    fileName?: string
    mimeType?: string
    sizeBytes?: number
    dataUrl?: string
    extractedText?: string
    metadata?: Record<string, unknown>
  }) {
    const response = await fetch('/api/media-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      const body = await response.json()
      throw new Error(body.error ?? 'Could not store media item')
    }
    const created = await response.json()
    setSelectedMediaIds((current) => [created.id, ...current])
  }

  async function handleFiles(files: FileList | File[]) {
    await runAction(async () => {
      for (const file of Array.from(files)) {
        const dataUrl = await readAsDataUrl(file)
        const extractedText = await extractText(file)
        const imageMetadata = file.type.startsWith('image/') ? await readImageMetadata(dataUrl) : {}
        const timedMetadata =
          file.type.startsWith('audio/') || file.type.startsWith('video/')
            ? await readTimedMediaMetadata(dataUrl, file.type)
            : {}
        await storeMediaItem({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataUrl,
          extractedText,
          metadata: {
            lastModified: file.lastModified,
            ...imageMetadata,
            ...timedMetadata,
          },
        })
      }
      await loadAll()
    })
  }

  async function saveDroppedText(event: FormEvent) {
    event.preventDefault()
    if (!droppedText) return
    await runAction(async () => {
      await storeMediaItem({
        fileName: 'dropped-text.txt',
        mimeType: 'text/plain',
        sizeBytes: droppedText.length,
        extractedText: droppedText,
        metadata: { origin: 'manual text drop' },
      })
      setDroppedText('')
      await loadAll()
    })
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const text = event.dataTransfer.getData('text/plain')
    if (event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files)
      return
    }
    if (text) {
      runAction(async () => {
        await storeMediaItem({
          fileName: 'dropped-text.txt',
          mimeType: 'text/plain',
          sizeBytes: text.length,
          extractedText: text,
          metadata: { origin: 'dragged text drop' },
        })
        await loadAll()
      })
    }
  }

  function toggleMedia(id: string) {
    setSelectedMediaIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleThought(id: string) {
    setSelectedThoughtIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function startIteration(event: FormEvent) {
    event.preventDefault()
    await runAction(async () => {
      const response = await fetch('/api/iterations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.slice(0, 80),
          prompt: prompt.trim() || undefined,
          mediaItemIds: selectedMediaIds,
          thoughtObjectIds: selectedThoughtIds,
        }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not start iteration')
      }
      await loadAll()
    })
  }

  async function iterate(sessionId: string) {
    await runAction(async () => {
      const response = await fetch(`/api/iterations/${sessionId}/iterate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not iterate')
      }
      await loadAll()
    })
  }

  return (
    <>
      <Head>
        <title>Liminal Studio - Idea Atlas</title>
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Liminal Studio</p>
            <h1>Drop media into the atlas</h1>
            <p className="lede">
              Store files or text, extract metadata, bind the material to atlas thought-objects,
              and iterate toward new content from the threshold between them.
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
            <div
              className={`dropZone ${dragging ? 'dropZoneActive' : ''}`}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDrop={onDrop}
            >
              <p className="eyebrow">Drop zone</p>
              <h2>Drop images, audio, video, documents, or text</h2>
              <p className="muted">
                No metadata form needed. Text is extracted directly; images, audio, video, and
                documents get classified and enriched automatically on upload.
              </p>
              <label className="button fileButton">
                Choose files
                <input
                  multiple
                  onChange={(event) => event.target.files && handleFiles(event.target.files)}
                  type="file"
                />
              </label>
            </div>

            <form className="card stack" onSubmit={saveDroppedText}>
              <h2>Or paste/drop text</h2>
              <textarea
                className="studioTextArea"
                onChange={(event) => setDroppedText(event.target.value)}
                placeholder="Paste a passage, idea, transcript, caption, or any raw text..."
                rows={12}
                value={droppedText}
              />
              <button className="button" disabled={busy || droppedText.length === 0}>
                Store text in atlas
              </button>
            </form>
          </section>

          <section className="grid">
            <section className="card stack">
              <div className="sectionHeader">
                <h2>Stored media</h2>
                <p className="muted">{selectedMediaIds.length} selected</p>
              </div>
              {mediaItems.length === 0 ? (
                <p className="muted">Nothing stored yet.</p>
              ) : (
                <div className="list">
                  {mediaItems.map((item) => (
                    <button
                      className={`mediaCard ${selectedMediaIds.includes(item.id) ? 'mediaCardSelected' : ''}`}
                      key={item.id}
                      onClick={() => toggleMedia(item.id)}
                      type="button"
                    >
                      <MediaPreview item={item} />
                      <span>
                        <strong>{String(item.metadata.inferredTitle || item.fileName || item.kind)}</strong>
                        <small>
                          {item.kind} · {item.mimeType || 'unknown'} ·{' '}
                          {typeof item.sizeBytes === 'number' ? formatBytes(item.sizeBytes) : 'unknown size'}
                        </small>
                        <small>
                          {Array.isArray(item.metadata.domains)
                            ? `domains: ${item.metadata.domains.join(', ')}`
                            : 'domains inferred'}
                        </small>
                        <small>
                          {Array.isArray(item.metadata.keywords)
                            ? `keywords: ${item.metadata.keywords.slice(0, 6).join(', ')}`
                            : 'keywords inferred'}
                        </small>
                      </span>
                      <code>{JSON.stringify(item.metadata, null, 2)}</code>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="card stack">
              <h2>Atlas context</h2>
              <p className="muted">Select thought-objects to act as conceptual pressure.</p>
              {thoughts.length === 0 ? (
                <p className="muted">No thought-objects yet. Create them from fragments first.</p>
              ) : (
                <div className="list">
                  {thoughts.map((thought) => (
                    <button
                      className={`listItem ${selectedThoughtIds.includes(thought.id) ? 'mediaCardSelected' : ''}`}
                      key={thought.id}
                      onClick={() => toggleThought(thought.id)}
                      type="button"
                    >
                      <strong>{thought.status}</strong>
                      <span>{thought.rawText.slice(0, 180)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="grid">
            <form className="card stack" onSubmit={startIteration}>
              <h2>Generate from the liminal region</h2>
              <p className="muted">
                Optional. Leave blank and the system will use the inferred brief below.
              </p>
              <label className="field">
                Creative brief override
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={autoPrompt}
                />
              </label>
              <div className="inferredPanel">
                <strong>Inferred brief</strong>
                <p>{autoPrompt}</p>
              </div>
              <div className="sourceChips">
                {selectedMedia.map((item) => (
                  <span key={item.id}>{item.fileName || item.kind}</span>
                ))}
                {selectedThoughtIds.map((id) => (
                  <span key={id}>thought:{id.slice(0, 8)}</span>
                ))}
              </div>
              <button
                className="button"
                disabled={busy || (!selectedMediaIds.length && !selectedThoughtIds.length)}
              >
                Auto-generate iteration
              </button>
            </form>

            <section className="card stack">
              <h2>Iteration controls</h2>
              <label className="field">
                Next direction
                <input value={direction} onChange={(event) => setDirection(event.target.value)} />
              </label>
              <button
                className="button"
                disabled={busy || !latestSession}
                onClick={() => latestSession && iterate(latestSession.id)}
                type="button"
              >
                Iterate latest draft
              </button>
              <p className="muted">
                Optional. Try: “make it more aphoristic”, “add hostile reading”, “lean into the
                image”, or leave the default direction.
              </p>
            </section>
          </section>

          <section className="card stack">
            <div className="sectionHeader">
              <h2>Iteration history</h2>
              <p className="muted">{sessions.length} session(s)</p>
            </div>
            {sessions.length === 0 ? (
              <p className="muted">No generated sessions yet.</p>
            ) : (
              sessions.map((session) => (
                <article className="iterationCard" key={session.id}>
                  <div>
                    <p className="eyebrow">{session.title}</p>
                    <h3>{session.prompt}</h3>
                  </div>
                  <pre>{session.currentDraft}</pre>
                  <p className="muted">{session.history.length} iteration step(s)</p>
                </article>
              ))
            )}
          </section>
        </main>
      </div>
    </>
  )
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.kind === 'image' && item.dataUrl) {
    return <img alt={item.fileName || 'Dropped image'} className="mediaThumb" src={item.dataUrl} />
  }
  if (item.kind === 'text') return <span className="mediaIcon">TXT</span>
  if (item.kind === 'audio') return <span className="mediaIcon">AUD</span>
  if (item.kind === 'video') return <span className="mediaIcon">VID</span>
  if (item.kind === 'document') return <span className="mediaIcon">DOC</span>
  return <span className="mediaIcon">MED</span>
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function extractText(file: File) {
  if (
    file.type.startsWith('text/') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.csv')
  ) {
    return file.text()
  }
  return undefined
}

function readImageMetadata(dataUrl: string) {
  return new Promise<Record<string, number>>((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({})
    image.src = dataUrl
  })
}

function readTimedMediaMetadata(dataUrl: string, mimeType: string) {
  return new Promise<Record<string, number>>((resolve) => {
    const element = mimeType.startsWith('video/') ? document.createElement('video') : new Audio()
    element.preload = 'metadata'
    element.onloadedmetadata = () => {
      const metadata: Record<string, number> = {}
      if (Number.isFinite(element.duration)) metadata.durationSeconds = Number(element.duration.toFixed(2))
      if (element instanceof HTMLVideoElement) {
        metadata.width = element.videoWidth
        metadata.height = element.videoHeight
      }
      resolve(metadata)
    }
    element.onerror = () => resolve({})
    element.src = dataUrl
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function inferClientPrompt(mediaItems: MediaItem[], thoughts: ThoughtObject[]) {
  const mediaTitles = mediaItems
    .map((item) => String(item.metadata.inferredTitle || item.fileName || item.kind))
    .slice(0, 3)
  const domains = Array.from(
    new Set([
      ...mediaItems.flatMap((item) =>
        Array.isArray(item.metadata.domains) ? item.metadata.domains.map(String) : [],
      ),
      ...thoughts.flatMap((thought) =>
        Array.isArray(thought.metadata?.domains) ? thought.metadata.domains.map(String) : [],
      ),
    ]),
  )
  const keywords = Array.from(
    new Set(
      mediaItems.flatMap((item) =>
        Array.isArray(item.metadata.keywords) ? item.metadata.keywords.map(String) : [],
      ),
    ),
  ).slice(0, 6)

  if (!mediaItems.length && !thoughts.length) {
    return 'Drop media or select atlas thoughts and the system will infer a brief.'
  }

  return `Generate novel liminal atlas material from ${
    mediaTitles.join(' + ') || 'selected atlas thoughts'
  }${domains.length ? ` across ${domains.slice(0, 4).join(', ')}` : ''}${
    keywords.length ? `, using signals like ${keywords.join(', ')}` : ''
  }.`
}
