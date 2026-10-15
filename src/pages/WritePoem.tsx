import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function WritePoem() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { session } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When editing, load the existing poem (RLS restricts to own poems)
  useEffect(() => {
    if (!id) return
    supabase
      .from('poems')
      .select('title, body, is_public, author_id')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false)
        if (error || !data) {
          setError('Could not load that poem.')
          return
        }
        if (data.author_id !== session?.user.id) {
          setError('You can only edit your own poems.')
          return
        }
        setTitle(data.title)
        setBody(data.body)
        setIsPublic(data.is_public)
      })
  }, [id, session])

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !saving

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !canSave) return
    setSaving(true)
    setError(null)

    if (isEditing && id) {
      const { data, error } = await supabase
        .from('poems')
        .update({
          title: title.trim(),
          body: body,
          is_public: isPublic,
        })
        .eq('id', id)
        .select('id')
        .single()
      setSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/poem/${data.id}`)
    } else {
      const { data, error } = await supabase
        .from('poems')
        .insert({
          author_id: session.user.id,
          title: title.trim(),
          body: body,
          is_public: isPublic,
        })
        .select('id')
        .single()
      setSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/poem/${data.id}`)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div className="write-page">
      <h1>{isEditing ? 'Edit poem' : 'Write a poem'}</h1>
      <form onSubmit={save} className="form">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a title"
            maxLength={200}
          />
        </label>

        <div className="editor-head">
          <span className="muted">Line breaks are preserved.</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {preview ? (
          <div className="poem-preview">
            {body ? (
              <pre className="poem-body">{body}</pre>
            ) : (
              <p className="muted">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            className="poem-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your poem here…"
            rows={14}
          />
        )}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public (uncheck to keep it as a private draft)
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" disabled={!canSave}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Publish'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
