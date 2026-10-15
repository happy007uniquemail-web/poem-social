import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem } from '../lib/types'
import PoemCard from '../components/PoemCard'

const PAGE_SIZE = 10

type SortMode = 'new' | 'liked' | 'following'

// Raw PostgREST shape: the nested tag join resolves to { tag: {...} }[]
type RawPoem = Omit<Poem, 'tags'> & {
  tags: { tag: { id: string; name: string } }[]
}

// Flatten the nested tag join used across the feed queries
function flatten(rows: unknown[]): Poem[] {
  return (rows as RawPoem[]).map((r) => ({
    ...r,
    tags: (r.tags ?? []).map((t) => t.tag).filter(Boolean),
  })) as Poem[]
}

const TAG_SELECT = '*, author:profiles!poems_author_id_fkey(*), tags:poem_tags(tag:tags(*))'

export default function Feed() {
  const { session } = useAuth()
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
      const to = from + PAGE_SIZE // one extra to detect more

      // "Following" needs the list of followed user IDs first
      if (mode === 'following') {
        if (!session) {
          setPoems([])
          setHasMore(false)
          setLoading(false)
          return
        }

        const { data: follows } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', session.user.id)

        const ids = (follows ?? []).map((f) => f.followee_id)
        if (ids.length === 0) {
          setPoems([])
          setHasMore(false)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('poems')
          .select(TAG_SELECT)
          .in('author_id', ids)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        const rows = data ?? []
        setHasMore(rows.length > PAGE_SIZE)
        const pageRows = flatten(rows.slice(0, PAGE_SIZE))
        setPoems((prev) => (pageNum === 0 ? pageRows : [...prev, ...pageRows]))
        setLoading(false)
        return
      }

      let query = supabase
        .from('poems')
        .select(TAG_SELECT)
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

      const rows = data ?? []
      setHasMore(rows.length > PAGE_SIZE)
      const pageRows = flatten(rows.slice(0, PAGE_SIZE))
      setPoems((prev) => (pageNum === 0 ? pageRows : [...prev, ...pageRows]))
      setLoading(false)
    },
    [session]
  )

  useEffect(() => {
    setPage(0)
    load(sort, 0)
  }, [sort, load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(sort, next)
  }

  const tabs: { key: SortMode; label: string }[] = [
    { key: 'new', label: 'Newest' },
    { key: 'liked', label: 'Most liked' },
    ...(session ? [{ key: 'following' as SortMode, label: 'Following' }] : []),
  ]

  return (
    <div className="feed">
      <div className="feed-head">
        <h1>Poems</h1>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={sort === t.key}
              className={`tab${sort === t.key ? ' active' : ''}`}
              onClick={() => setSort(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!loading && poems.length === 0 && !error && (
        <p className="muted">
          {sort === 'following'
            ? 'Nothing from people you follow yet. Follow some poets to fill this feed.'
            : 'No poems yet. Be the first to write one.'}
        </p>
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
