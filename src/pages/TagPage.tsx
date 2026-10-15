import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Poem } from '../lib/types'
import PoemCard from '../components/PoemCard'

export default function TagPage() {
  const { name } = useParams<{ name: string }>()
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!name) return
    setLoading(true)

    // Find the tag, then its poems via the join table
    const { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('name', name.toLowerCase())
      .maybeSingle()

    if (!tag) {
      setNotFound(true)
      setPoems([])
      setLoading(false)
      return
    }

    const { data: links } = await supabase
      .from('poem_tags')
      .select('poem_id')
      .eq('tag_id', tag.id)

    const ids = (links ?? []).map((l) => l.poem_id)
    if (ids.length === 0) {
      setPoems([])
      setLoading(false)
      return
    }

    const { data: rows } = await supabase
      .from('poems')
      .select('*, author:profiles!poems_author_id_fkey(*)')
      .in('id', ids)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    setPoems((rows ?? []) as unknown as Poem[])
    setNotFound(false)
    setLoading(false)
  }, [name])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="tag-page">
      <h1 className="tag-page-title">#{name}</h1>

      {loading && <p className="muted">Loading…</p>}
      {notFound && !loading && (
        <p className="muted">
          No tag named “{name}” yet. <Link to="/">Back to the feed</Link>
        </p>
      )}
      {!loading && !notFound && poems.length === 0 && (
        <p className="muted">No public poems with this tag yet.</p>
      )}

      <div className="poem-list">
        {poems.map((poem) => (
          <PoemCard key={poem.id} poem={poem} onChange={load} />
        ))}
      </div>
    </div>
  )
}
