import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

type Axis = {
  id: string
  name: string
  minLabel: string
  maxLabel: string
  description: string | null
  displayOrder: number
  deletedAt: string | null
}

type AxisForm = {
  name: string
  minLabel: string
  maxLabel: string
  description: string
  displayOrder: number
}

const emptyAxis: AxisForm = {
  name: '',
  minLabel: '',
  maxLabel: '',
  description: '',
  displayOrder: 0,
}

function formFromAxis(axis: Axis): AxisForm {
  return {
    name: axis.name,
    minLabel: axis.minLabel,
    maxLabel: axis.maxLabel,
    description: axis.description ?? '',
    displayOrder: axis.displayOrder,
  }
}

export default function AxesPage() {
  const [axes, setAxes] = useState<Axis[]>([])
  const [editing, setEditing] = useState<Record<string, AxisForm>>({})
  const [newAxis, setNewAxis] = useState(emptyAxis)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadAxes() {
    const response = await fetch('/api/axes')
    if (!response.ok) throw new Error('Could not load axes')
    const body = await response.json()
    setAxes(body)
    setEditing(Object.fromEntries(body.map((axis: Axis) => [axis.id, formFromAxis(axis)])))
  }

  useEffect(() => {
    loadAxes().catch((err) => setError(err.message))
  }, [])

  async function createAxis(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/axes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAxis),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not create axis')
      }
      setNewAxis(emptyAxis)
      await loadAxes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create axis')
    } finally {
      setSaving(false)
    }
  }

  async function updateAxis(axisId: string) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/axes/${axisId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing[axisId]),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not update axis')
      }
      await loadAxes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update axis')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAxis(axisId: string) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/axes/${axisId}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Could not delete axis')
      }
      await loadAxes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete axis')
    } finally {
      setSaving(false)
    }
  }

  function updateEditing(axisId: string, patch: Partial<AxisForm>) {
    setEditing({
      ...editing,
      [axisId]: { ...editing[axisId], ...patch },
    })
  }

  return (
    <>
      <Head>
        <title>Worldview Axes - Idea Atlas</title>
      </Head>
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Worldview axes</p>
            <h1>Calibrate the atlas</h1>
            <p className="lede">
              These editable tensions will guide later structuring, retrieval, and generation.
            </p>
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
              <h2>Active axes</h2>
              <button className="ghostButton" onClick={() => loadAxes()} type="button">
                Refresh
              </button>
            </div>
            {axes.length === 0 ? (
              <p className="muted">No active axes.</p>
            ) : (
              axes.map((axis) => {
                const form = editing[axis.id] ?? formFromAxis(axis)
                return (
                  <div className="axisRow" key={axis.id}>
                    <div className="twoCol">
                      <label className="field">
                        Name
                        <input
                          value={form.name}
                          onChange={(event) => updateEditing(axis.id, { name: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        Display order
                        <input
                          type="number"
                          value={form.displayOrder}
                          onChange={(event) =>
                            updateEditing(axis.id, {
                              displayOrder: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        Min label
                        <input
                          value={form.minLabel}
                          onChange={(event) =>
                            updateEditing(axis.id, { minLabel: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Max label
                        <input
                          value={form.maxLabel}
                          onChange={(event) =>
                            updateEditing(axis.id, { maxLabel: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      Description
                      <textarea
                        rows={2}
                        value={form.description}
                        onChange={(event) =>
                          updateEditing(axis.id, { description: event.target.value })
                        }
                      />
                    </label>
                    <div className="row">
                      <button
                        className="ghostButton"
                        disabled={saving}
                        onClick={() => updateAxis(axis.id)}
                        type="button"
                      >
                        Save axis
                      </button>
                      <button
                        className="dangerButton"
                        disabled={saving}
                        onClick={() => deleteAxis(axis.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </section>

          <form className="card stack" onSubmit={createAxis}>
            <h2>Add axis</h2>
            <div className="twoCol">
              <label className="field">
                Name
                <input
                  required
                  value={newAxis.name}
                  onChange={(event) => setNewAxis({ ...newAxis, name: event.target.value })}
                />
              </label>
              <label className="field">
                Display order
                <input
                  type="number"
                  value={newAxis.displayOrder}
                  onChange={(event) =>
                    setNewAxis({ ...newAxis, displayOrder: Number(event.target.value) })
                  }
                />
              </label>
              <label className="field">
                Min label
                <input
                  required
                  value={newAxis.minLabel}
                  onChange={(event) => setNewAxis({ ...newAxis, minLabel: event.target.value })}
                />
              </label>
              <label className="field">
                Max label
                <input
                  required
                  value={newAxis.maxLabel}
                  onChange={(event) => setNewAxis({ ...newAxis, maxLabel: event.target.value })}
                />
              </label>
            </div>
            <label className="field">
              Description
              <textarea
                rows={3}
                value={newAxis.description}
                onChange={(event) => setNewAxis({ ...newAxis, description: event.target.value })}
              />
            </label>
            <button className="button" disabled={saving}>
              Add axis
            </button>
          </form>
        </main>
      </div>
    </>
  )
}
