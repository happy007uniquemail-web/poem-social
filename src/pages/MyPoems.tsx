import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem } from '../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function MyPoems() {
  const { session } = useAuth()
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data, error } = await supabase
      .from('poems')
      .select('*')
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPoems((data ?? []) as unknown as Poem[])
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id: string) => {
    if (!window.confirm('Delete this poem? This cannot be undone.')) return
    const { error } = await supabase.from('poems').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setPoems((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <h1>My poems</h1>
        <Link to="/write" className="btn btn-primary">
          Write a poem
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && poems.length === 0 && (
        <p className="muted">
          You haven’t written any poems yet.{' '}
          <Link to="/write">Write your first one.</Link>
        </p>
      )}

      <div className="row-list">
        {poems.map((poem) => (
          <div key={poem.id} className="row-item">
            <div className="row-main">
              <Link to={`/poem/${poem.id}`} className="row-title">
                {poem.title}
              </Link>
              <span className="row-meta">
                {formatDate(poem.created_at)} · ♥ {poem.like_count}
                {!poem.is_public && (
                  <>
                    {' · '}
                    <span className="badge badge-private">Private</span>
                  </>
                )}
              </span>
            </div>
            <div className="row-actions">
              <Link to={`/edit/${poem.id}`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => remove(poem.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
