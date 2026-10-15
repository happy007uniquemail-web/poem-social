import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem } from '../lib/types'
import LikeButton from '../components/LikeButton'
import RepostButton from '../components/RepostButton'
import Comments from '../components/Comments'
import { TagList } from '../components/TagsInput'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PoemPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [poem, setPoem] = useState<Poem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('poems')
      .select(
        '*, author:profiles!poems_author_id_fkey(*), tags:poem_tags(tag:tags(*))'
      )
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // Flatten the nested tags join: [{ tag: {...} }] -> [ {...} ]
    const row = data as unknown as Omit<Poem, 'tags'> & {
      tags: { tag: { id: string; name: string } }[]
    }
    const flat = {
      ...row,
      tags: (row.tags ?? [])
        .map((t) => t.tag)
        .filter(Boolean),
    } as unknown as Poem

    setPoem(flat)
    setNotFound(false)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const isOwner = !!session && !!poem && session.user.id === poem.author_id

  const handleDelete = async () => {
    if (!poem) return
    if (!window.confirm('Delete this poem? This cannot be undone.')) return
    setDeleting(true)
    const { error } = await supabase.from('poems').delete().eq('id', poem.id)
    setDeleting(false)
    if (!error) navigate('/my-poems')
  }

  if (loading) return <p className="muted">Loading…</p>

  if (notFound || !poem) {
    return (
      <div className="poem-page">
        <h1>Poem not found</h1>
        <p className="muted">It may have been deleted, or it’s private.</p>
        <Link to="/" className="btn btn-ghost">
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <article className="poem-page">
      <header className="poem-page-head">
        <h1>{poem.title}</h1>
        {!poem.is_public && <span className="badge badge-private">Private</span>}
      </header>

      {poem.author && (
        <Link to={`/u/${poem.author.username}`} className="poem-page-author">
          {poem.author.avatar_url && (
            <img
              className="avatar"
              src={poem.author.avatar_url}
              alt={poem.author.username}
            />
          )}
          <span>{poem.author.display_name || poem.author.username}</span>
        </Link>
      )}

      <TagList tags={poem.tags} />

      <pre className="poem-body">{poem.body}</pre>

      <div className="poem-page-foot">
        <span className="muted">
          Written {formatDate(poem.created_at)}
          {poem.updated_at !== poem.created_at &&
            ` · edited ${formatDate(poem.updated_at)}`}
        </span>
        <div className="action-row">
          <LikeButton
            poemId={poem.id}
            likeCount={poem.like_count}
            onChange={load}
          />
          <RepostButton
            poemId={poem.id}
            repostCount={poem.repost_count}
            onChange={load}
          />
        </div>
      </div>

      {isOwner && (
        <div className="owner-actions">
          <Link to={`/edit/${poem.id}`} className="btn btn-ghost">
            Edit
          </Link>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}

      <Comments poemId={poem.id} />
    </article>
  )
}
