import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import TagsInput from '../components/TagsInput'

export default function WritePoem() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { session } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('poems')
      .select(
        'title, body, is_public, author_id, tags:poem_tags(tag:tags(name))'
      )
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false)
        if (error || !data) {
          setError('Could not load that poem.')
          return
        }
        const row = data as unknown as {
          title: string
          body: string
          is_public: boolean
          author_id: string
          tags: { tag: { name: string } }[]
        }
        if (row.author_id !== session?.user.id) {
          setError('You can only edit your own poems.')
          return
        }
        setTitle(row.title)
        setBody(row.body)
        setIsPublic(row.is_public)
        setTags((row.tags ?? []).map((t) => t.tag.name).filter(Boolean))
      })
  }, [id, session])

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !saving

  // Resolve tag names to IDs, creating any that don't exist yet.
  const resolveTags = async (poemId: string) => {
    if (tags.length === 0) return

    const { data: existing } = await supabase
      .from('tags')
      .select('id, name')
      .in('name', tags)

    const found = new Map((existing ?? []).map((t) => [t.name, t.id]))
    const missing = tags.filter((t) => !found.has(t))

    if (missing.length > 0) {
      const { data: created, error } = await supabase
        .from('tags')
        .insert(missing.map((name) => ({ name })))
        .select('id, name')
      if (error) return
      for (const t of created ?? []) found.set(t.name, t.id)
    }

    const links = tags
      .filter((name) => found.has(name))
      .map((name) => ({ poem_id: poemId, tag_id: found.get(name)! }))

    if (links.length > 0) {
      await supabase.from('poem_tags').upsert(links, {
        onConflict: 'poem_id,tag_id',
        ignoreDuplicates: true,
      })
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !canSave) return
    setSaving(true)
    setError(null)

    let poemId: string

    if (isEditing && id) {
      const { data, error } = await supabase
        .from('poems')
        .update({ title: title.trim(), body, is_public: isPublic })
        .eq('id', id)
        .select('id')
        .single()
      if (error) {
        setSaving(false)
        setError(error.message)
        return
      }
      poemId = data.id
      // Clear existing links before re-linking
      await supabase.from('poem_tags').delete().eq('poem_id', id)
    } else {
      const { data, error } = await supabase
        .from('poems')
        .insert({
          author_id: session.user.id,
          title: title.trim(),
          body,
          is_public: isPublic,
        })
        .select('id')
        .single()
      if (error) {
        setSaving(false)
        setError(error.message)
        return
      }
      poemId = data.id
    }

    await resolveTags(poemId)
    setSaving(false)
    navigate(`/poem/${poemId}`)
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

        <label className="tags-label">Tags</label>
        <TagsInput tags={tags} onChange={setTags} />

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
