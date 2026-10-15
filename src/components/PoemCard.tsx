import { Link } from 'react-router-dom'
import type { Poem } from '../lib/types'
import LikeButton from './LikeButton'
import RepostButton from './RepostButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const EXCERPT_LENGTH = 220

export default function PoemCard({
  poem,
  onChange,
  showPrivateBadge = false,
}: {
  poem: Poem
  onChange?: () => void
  showPrivateBadge?: boolean
}) {
  const excerpt =
    poem.body.length > EXCERPT_LENGTH
      ? poem.body.slice(0, EXCERPT_LENGTH).trimEnd() + '…'
      : poem.body

  return (
    <article className="poem-card">
      <div className="poem-card-head">
        <h2 className="poem-card-title">
          <Link to={`/poem/${poem.id}`}>{poem.title}</Link>
        </h2>
        {showPrivateBadge && !poem.is_public && (
          <span className="badge badge-private">Private</span>
        )}
      </div>

      {poem.author && (
        <Link to={`/u/${poem.author.username}`} className="poem-card-author">
          {poem.author.avatar_url && (
            <img
              className="avatar avatar-sm"
              src={poem.author.avatar_url}
              alt=""
            />
          )}
          {poem.author.display_name || poem.author.username}
        </Link>
      )}

      <pre className="poem-excerpt">{excerpt}</pre>

      {poem.tags && poem.tags.length > 0 && (
        <div className="tags-row poem-card-tags">
          {poem.tags.map((t) => (
            <Link
              key={t.id}
              to={`/tag/${encodeURIComponent(t.name)}`}
              className="tag"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="poem-card-foot">
        <span className="poem-date">{formatDate(poem.created_at)}</span>
        <div className="action-row">
          {poem.comment_count > 0 && (
            <Link
              to={`/poem/${poem.id}`}
              className="mini-count"
              title="Comments"
            >
              💬 {poem.comment_count}
            </Link>
          )}
          <LikeButton
            poemId={poem.id}
            likeCount={poem.like_count}
            onChange={onChange}
          />
          <RepostButton
            poemId={poem.id}
            repostCount={poem.repost_count}
            onChange={onChange}
          />
        </div>
      </div>
    </article>
  )
}
