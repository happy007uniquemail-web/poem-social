import { useState } from 'react'
import type { Tag } from '../lib/types'

const MAX_TAGS = 5
const TAG_RE = /^[a-z0-9-]{1,30}$/

export default function TagsInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const name = draft.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    if (!TAG_RE.test(name)) {
      setError('Tags can use letters, numbers, and hyphens.')
      return
    }
    if (tags.includes(name)) {
      setError('Already added.')
      setDraft('')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Maximum ${MAX_TAGS} tags.`)
      return
    }
    setError(null)
    onChange([...tags, name])
    setDraft('')
  }

  const remove = (name: string) => {
    onChange(tags.filter((t) => t !== name))
  }

  return (
    <div className="tags-input">
      <div className="tags-row">
        {tags.map((t) => (
          <span key={t} className="tag tag-removable">
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`Remove tag ${t}`}
            >
              ✕
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                add()
              }
            }}
            onBlur={add}
            placeholder={tags.length === 0 ? 'Add tags (e.g. love, nature)' : 'Add another…'}
            className="tag-field"
            maxLength={30}
          />
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <p className="muted tag-hint">
        Press Enter to add. {MAX_TAGS - tags.length} remaining.
      </p>
    </div>
  )
}

export function TagList({ tags }: { tags?: Tag[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="tags-row">
      {tags.map((t) => (
        <a key={t.id} href={`/tag/${encodeURIComponent(t.name)}`} className="tag">
          #{t.name}
        </a>
      ))}
    </div>
  )
}
