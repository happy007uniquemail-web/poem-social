import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Poem } from '../lib/types'
import PoemCard from '../components/PoemCard'

const PAGE_SIZE = 10

type SortMode = 'new' | 'liked'

export default function Feed() {
  const [sort, setSort] = useState<SortMode>('new')
  const [page, setPage] = useState(0)
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(
    async (mode: SortMode, pageNum: number) => {
      setLoading(true)
      setError(null)

      const from = pageNum * PAGE_SIZE
      const to = from + PAGE_SIZE // fetch one extra to detect more

      let query = supabase
        .from('poems')
        .select('*, author:profiles(*)')
        .eq('is_public', true)
        .range(from, to)

      if (mode === 'new') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as unknown as Poem[]
      setHasMore(rows.length > PAGE_SIZE)
      const pageRows = rows.slice(0, PAGE_SIZE)
      setPoems((prev) => (pageNum === 0 ? pageRows : [...prev, ...pageRows]))
      setLoading(false)
    },
    []
  )

  // Reload from the top whenever the sort mode changes
  useEffect(() => {
    setPage(0)
    load(sort, 0)
  }, [sort, load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(sort, next)
  }

  return (
    <div className="feed">
      <div className="feed-head">
        <h1>Poems</h1>
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={sort === 'new'}
            className={`tab${sort === 'new' ? ' active' : ''}`}
            onClick={() => setSort('new')}
          >
            Newest
          </button>
          <button
            role="tab"
            aria-selected={sort === 'liked'}
            className={`tab${sort === 'liked' ? ' active' : ''}`}
            onClick={() => setSort('liked')}
          >
            Most liked
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!loading && poems.length === 0 && !error && (
        <p className="muted">No poems yet. Be the first to write one.</p>
      )}

      <div className="poem-list">
        {poems.map((poem) => (
          <PoemCard key={poem.id} poem={poem} onChange={() => load(sort, 0)} />
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {hasMore && !loading && (
        <button className="btn btn-ghost" onClick={loadMore}>
          Load more
        </button>
      )}
    </div>
  )
}
