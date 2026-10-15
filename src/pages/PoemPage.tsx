import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem } from '../lib/types'
import LikeButton from '../components/LikeButton'

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
      .select('*, author:profiles(*)')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setNotFound(true)
      setLoading(false)
      return
    }
    if (!data) {
      // RLS hides poems the viewer can't see
      setNotFound(true)
    } else {
      setPoem(data as unknown as Poem)
    }
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
        <p className="muted">
          It may have been deleted, or it’s private.
        </p>
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

      <pre className="poem-body">{poem.body}</pre>

      <div className="poem-page-foot">
        <span className="muted">
          Written {formatDate(poem.created_at)}
          {poem.updated_at !== poem.created_at &&
            ` · edited ${formatDate(poem.updated_at)}`}
        </span>
        <LikeButton
          poemId={poem.id}
          likeCount={poem.like_count}
          onChange={load}
        />
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
    </article>
  )
}
