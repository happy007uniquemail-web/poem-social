import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Comment } from '../lib/types'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function Comments({ poemId }: { poemId: string }) {
  const { session } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(*)')
      .eq('poem_id', poemId)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setComments((data ?? []) as unknown as Comment[])
    setLoading(false)
  }, [poemId])

  useEffect(() => {
    load()
  }, [load])

  const post = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !body.trim() || posting) return
    setPosting(true)
    setError(null)

    const { error } = await supabase.from('comments').insert({
      poem_id: poemId,
      author_id: session.user.id,
      body: body.trim(),
    })

    setPosting(false)
    if (error) {
      setError(error.message)
      return
    }
    setBody('')
    load()
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this comment?')) return
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section className="comments">
      <h2 className="section-title">
        Comments{comments.length > 0 && ` (${comments.length})`}
      </h2>

      {session ? (
        <form onSubmit={post} className="comment-form">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={2000}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!body.trim() || posting}
          >
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="muted">
          <Link to="/login">Sign in</Link> to join the conversation.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="comment-list">
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-head">
              {c.author && (
                <Link to={`/u/${c.author.username}`} className="comment-author">
                  {c.author.avatar_url && (
                    <img
                      className="avatar avatar-sm"
                      src={c.author.avatar_url}
                      alt=""
                    />
                  )}
                  {c.author.display_name || c.author.username}
                </Link>
              )}
              <span className="comment-time">{timeAgo(c.created_at)}</span>
              {session?.user.id === c.author_id && (
                <button
                  className="comment-delete"
                  onClick={() => remove(c.id)}
                  aria-label="Delete comment"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        ))}
      </div>

      {!loading && comments.length === 0 && (
        <p className="muted">No comments yet. Be the first.</p>
      )}
    </section>
  )
}
