import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem } from '../lib/types'

export default function LikedPoems() {
  const { session } = useAuth()
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data, error } = await supabase
      .from('likes')
      .select('poem:poems(*, author:profiles!poems_author_id_fkey(*))')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const rows = (data ?? [])
      .map((r: any) => r.poem as Poem | null)
      .filter(Boolean) as Poem[]
    setPoems(rows)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="dashboard">
      <h1>Liked poems</h1>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && poems.length === 0 && (
        <p className="muted">
          You haven’t liked any poems yet. Browse the{' '}
          <Link to="/">feed</Link> to find some.
        </p>
      )}

      <div className="poem-list">
        {poems.map((poem) => (
          <div key={poem.id} className="liked-item">
            <Link to={`/poem/${poem.id}`} className="liked-title">
              {poem.title}
            </Link>
            {poem.author && (
              <span className="muted">
                {' '}
                by{' '}
                <Link to={`/u/${poem.author.username}`}>
                  {poem.author.display_name || poem.author.username}
                </Link>
              </span>
            )}
            <pre className="poem-excerpt">{poem.body.slice(0, 160)}…</pre>
            <span className="muted">♥ {poem.like_count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
