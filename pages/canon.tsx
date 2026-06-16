import Head from 'next/head'
import Link from 'next/link'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'

type MemoryEntry = {
  id: string
  rawText: string
  title: string | null
  fragmentType: string
  inferredMetadata: Record<string, unknown> | null
  processingState: string
  generationReadiness: string
  processingJobs?: Array<{ jobType: string; status: string; error?: string | null }>
  createdAt: string
}

export default function CanonPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadEntries() {
    const response = await fetch('/api/fragments')
    if (!response.ok) throw new Error('Could not load memory material')
    setEntries(await response.json())
  }

  useEffect(() => {
    loadEntries().catch((err) => setError(err.message))
    const timer = window.setInterval(() => {
      loadEntries().catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(timer)
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

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    await runAction(async () => {
      await Promise.all(files.map(uploadFile))
      event.target.value = ''
      await loadEntries()
    })
  }

  async function saveText(event: FormEvent) {
    event.preventDefault()
    await runAction(async () => {
      if (!rawText.trim()) throw new Error('Paste or upload material first')
      const response = await fetch('/api/fragments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          sourceType: 'personal',
          fragmentType: 'pasted-text',
          isPromoted: true,
        }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not store material')
      }
      setRawText('')
      await loadEntries()
    })
  }

  return (
    <>
      <Head>
        <title>Upload Material - Idea Atlas</title>
        <meta name="description" content="Upload material and inspiration for the memory brain" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Upload Material</p>
            <h1>Feed the memory/brain</h1>
            <p className="lede">
              Upload media or paste inspiration. The system automatically extracts metadata, builds
              memory nodes, and makes the material available for generated content.
            </p>
          </div>
          <nav className="nav">
            <Link href="/upload">Upload Material</Link>
            <Link href="/memory">Memory/Brain</Link>
            <Link href="/generated">Generated Content</Link>
          </nav>
        </header>

        {error && <p className="error">{error}</p>}

        <main className="grid">
          <section className="card stack">
            <p className="eyebrow">Automatic Ingestion</p>
            <h2>No metadata forms</h2>
            <p className="muted">
              Drop files or paste material. Everything else is inferred and stored by the system.
            </p>
            <label className="dropZone">
              <strong>{busy ? 'Processing material...' : 'Upload files into the brain'}</strong>
              <span className="muted">Images, text files, documents, audio, video, notes, drafts.</span>
              <input multiple onChange={uploadMedia} type="file" />
            </label>
            <form className="stack" onSubmit={saveText}>
              <label className="field">
                Paste text material
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste a quote, passage, draft, note, or inspiration. The system handles metadata."
                />
              </label>
              <button className="button" disabled={busy || !rawText.trim()}>
                Store in memory/brain
              </button>
            </form>
          </section>

          <section className="card stack">
            <p className="eyebrow">Memory Intake</p>
            <h2>{entries.length} stored material item(s)</h2>
            {entries.length === 0 ? (
              <p className="muted">Upload material to start building the brain.</p>
            ) : (
              <div className="list">
                {entries.map((entry) => (
                  <article className="thoughtCard stack" key={entry.id}>
                    <div className="sourceChips">
                      <span>{labelFor(entry.fragmentType)}</span>
                      <span>{processingLabel(entry.processingState)}</span>
                      <span>{readinessLabel(entry.generationReadiness)}</span>
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3>{entry.title || metadataTitle(entry) || preview(entry.rawText, 90)}</h3>
                    <p className="rawText">{preview(entry.rawText, 220)}</p>
                    <div className="inferredPanel">
                      <h3>Auto metadata</h3>
                      {entry.inferredMetadata ? (
                        Object.entries(entry.inferredMetadata).map(([key, value]) => (
                          <p key={key}>
                            <strong>{labelFor(key)}:</strong> {formatMetadata(value)}
                          </p>
                        ))
                      ) : (
                        <p>Metadata will appear after processing.</p>
                      )}
                      {entry.processingJobs && entry.processingJobs.length > 0 ? (
                        <div className="jobList">
                          {entry.processingJobs.map((job) => (
                            <p key={job.jobType}>
                              <strong>{labelFor(job.jobType)}:</strong> {job.status}
                              {job.error ? ` — ${job.error}` : ''}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  )
}

async function uploadFile(file: File) {
  const [dataUrl, extractedText] = await Promise.all([
    readAsDataUrl(file),
    file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
      ? readAsText(file)
      : Promise.resolve(''),
  ])

  const response = await fetch('/api/media-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      dataUrl,
      extractedText,
      metadata: { importSurface: 'automatic-upload' },
    }),
  })

  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.error ?? `Could not upload ${file.name}`)
  }
}

function metadataTitle(entry: MemoryEntry) {
  const title = entry.inferredMetadata?.title
  return typeof title === 'string' ? title : undefined
}

function labelFor(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function processingLabel(state: string) {
  if (state === 'succeeded') return 'Processed'
  if (state === 'running') return 'Processing'
  if (state === 'failed') return 'Failed'
  if (state === 'skipped') return 'Skipped'
  return 'Queued'
}

function readinessLabel(state: string) {
  if (state === 'ready') return 'Generation ready'
  if (state === 'partial') return 'Partial memory'
  if (state === 'failed') return 'Blocked'
  return 'Not ready'
}

function preview(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}...` : text
}

function formatMetadata(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
