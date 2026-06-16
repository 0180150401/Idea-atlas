import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react'

type ThoughtObject = {
  id: string
  sourceFragmentId: string
  rawText: string
  createdAt: string
  updatedAt: string
}

type FragmentDetail = {
  id: string
  rawText: string
  sourceType: string
  title: string | null
  author: string | null
  citation: string | null
  url: string | null
  personalContext: string | null
  createdAt: string
  thoughtObjects: ThoughtObject[]
}

type MetadataForm = {
  sourceType: string
  title: string
  author: string
  citation: string
  url: string
  personalContext: string
}

function metadataFromFragment(fragment: FragmentDetail): MetadataForm {
  return {
    sourceType: fragment.sourceType,
    title: fragment.title ?? '',
    author: fragment.author ?? '',
    citation: fragment.citation ?? '',
    url: fragment.url ?? '',
    personalContext: fragment.personalContext ?? '',
  }
}

export default function FragmentPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const textRef = useRef<HTMLDivElement | null>(null)
  const [fragment, setFragment] = useState<FragmentDetail | null>(null)
  const [metadata, setMetadata] = useState<MetadataForm | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [editingThoughts, setEditingThoughts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadFragment(fragmentId = id) {
    if (!fragmentId) return
    const response = await fetch(`/api/fragments/${fragmentId}`)
    if (!response.ok) throw new Error('Could not load fragment')
    const body = await response.json()
    setFragment(body)
    setMetadata(metadataFromFragment(body))
    setEditingThoughts(
      Object.fromEntries(
        body.thoughtObjects.map((thought: ThoughtObject) => [thought.id, thought.rawText]),
      ),
    )
  }

  useEffect(() => {
    loadFragment().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function captureSelection(event: MouseEvent<HTMLDivElement>) {
    if (!textRef.current?.contains(event.target as Node)) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelectedText('')
      return
    }
    setSelectedText(selection.toString())
  }

  async function saveThoughtObject(rawText: string) {
    if (!fragment) return
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/thought-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFragmentId: fragment.id, rawText }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not save thought-object')
      }
      setSelectedText('')
      await loadFragment(fragment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save thought-object')
    } finally {
      setSaving(false)
    }
  }

  async function updateMetadata(event: FormEvent) {
    event.preventDefault()
    if (!fragment || !metadata) return
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/fragments/${fragment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not update metadata')
      }
      await loadFragment(fragment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update metadata')
    } finally {
      setSaving(false)
    }
  }

  async function updateThoughtObject(thoughtId: string) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/thought-objects/${thoughtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: editingThoughts[thoughtId] }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not update thought-object')
      }
      await loadFragment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update thought-object')
    } finally {
      setSaving(false)
    }
  }

  if (!fragment || !metadata) {
    return (
      <div className="shell">
        <p>{error || 'Loading fragment...'}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{fragment.title || 'Fragment'} - Idea Atlas</title>
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Fragment</p>
            <h1>{fragment.title || 'Untitled source fragment'}</h1>
            <p className="lede">Select text below to save it as an atomic thought-object.</p>
          </div>
          <nav className="nav">
            <Link href="/upload">Upload Material</Link>
            <Link href="/memory">Memory/Brain</Link>
            <Link href="/generated">Generated Content</Link>
          </nav>
        </header>

        <main className="stack">
          {error && <p className="error">{error}</p>}

          <section className="card stack">
            <div className="sectionHeader">
              <h2>Raw text</h2>
              <button
                className="ghostButton"
                disabled={saving}
                onClick={() => saveThoughtObject(fragment.rawText)}
                type="button"
              >
                Save whole fragment as thought-object
              </button>
            </div>
            <div className="rawText" onMouseUp={captureSelection} ref={textRef}>
              {fragment.rawText}
            </div>
            {selectedText && (
              <div className="selectionBar">
                <span>{selectedText.length} selected characters</span>
                <button
                  className="button"
                  disabled={saving}
                  onClick={() => saveThoughtObject(selectedText)}
                  type="button"
                >
                  Save selection as thought-object
                </button>
              </div>
            )}
          </section>

          <section className="grid">
            <form className="card stack" onSubmit={updateMetadata}>
              <h2>Source metadata</h2>
              <label className="field">
                Source type
                <select
                  value={metadata.sourceType}
                  onChange={(event) => setMetadata({ ...metadata, sourceType: event.target.value })}
                >
                  <option value="book">Book</option>
                  <option value="article">Article</option>
                  <option value="personal">Personal</option>
                  <option value="web">Web</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                Title
                <input
                  value={metadata.title}
                  onChange={(event) => setMetadata({ ...metadata, title: event.target.value })}
                />
              </label>
              <label className="field">
                Author
                <input
                  value={metadata.author}
                  onChange={(event) => setMetadata({ ...metadata, author: event.target.value })}
                />
              </label>
              <label className="field">
                Citation
                <input
                  value={metadata.citation}
                  onChange={(event) => setMetadata({ ...metadata, citation: event.target.value })}
                />
              </label>
              <label className="field">
                URL
                <input
                  value={metadata.url}
                  onChange={(event) => setMetadata({ ...metadata, url: event.target.value })}
                />
              </label>
              <label className="field">
                Personal context
                <textarea
                  rows={4}
                  value={metadata.personalContext}
                  onChange={(event) =>
                    setMetadata({ ...metadata, personalContext: event.target.value })
                  }
                />
              </label>
              <button className="button" disabled={saving}>
                Save metadata
              </button>
            </form>

            <section className="card stack">
              <h2>Thought-objects</h2>
              {fragment.thoughtObjects.length === 0 ? (
                <p className="muted">No thought-objects saved for this fragment yet.</p>
              ) : (
                fragment.thoughtObjects.map((thought) => (
                  <div className="thoughtCard" key={thought.id}>
                    <label className="field">
                      Raw text
                      <textarea
                        rows={5}
                        value={editingThoughts[thought.id] ?? thought.rawText}
                        onChange={(event) =>
                          setEditingThoughts({
                            ...editingThoughts,
                            [thought.id]: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="ghostButton"
                      disabled={saving}
                      onClick={() => updateThoughtObject(thought.id)}
                      type="button"
                    >
                      Save thought-object
                    </button>
                  </div>
                ))
              )}
            </section>
          </section>
        </main>
      </div>
    </>
  )
}
