import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { Poem, Profile as ProfileType, Repost } from '../lib/types'
import PoemCard from '../components/PoemCard'
import FollowButton from '../components/FollowButton'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get('tab') || 'poems'

  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [poems, setPoems] = useState<Poem[]>([])
  const [reposts, setReposts] = useState<Repost[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!username) return
    setLoading(true)

    const { data: prof, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (error || !prof) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const p = prof as ProfileType
    setProfile(p)
    setBio(p.bio || '')
    setDisplayName(p.display_name || '')

    const [{ data: rows }, { data: reps }] = await Promise.all([
      supabase
        .from('poems')
        .select('*, tags:poem_tags(tag:tags(*))')
        .eq('author_id', p.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('reposts')
        .select('*, poem:poems(*, author:profiles!poems_author_id_fkey(*))')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false }),
    ])

    const withTags = ((rows ?? []) as unknown as (Omit<Poem, 'tags'> & {
      tags: { tag: { id: string; name: string } }[]
    })[]).map((r) => ({
      ...r,
      tags: (r.tags ?? []).map((t) => t.tag).filter(Boolean),
    })) as unknown as Poem[]

    setPoems(withTags)
    setReposts((reps ?? []) as unknown as Repost[])
    setLoading(false)
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const isOwn = !!session && !!profile && session.user.id === profile.id

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bio || null, display_name: displayName || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    load()
  }

  if (loading) return <p className="muted">Loading…</p>

  if (notFound || !profile) {
    return (
      <div className="profile-page">
        <h1>Profile not found</h1>
        <p className="muted">This user doesn’t exist.</p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-head">
        {profile.avatar_url ? (
          <img
            className="avatar avatar-lg"
            src={profile.avatar_url}
            alt={profile.username}
          />
        ) : (
          <div className="avatar avatar-lg avatar-fallback">
            {(profile.display_name || profile.username).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-id">
          <h1>{profile.display_name || profile.username}</h1>
          <p className="muted">@{profile.username}</p>
        </div>
        <div className="profile-actions">
          {isOwn ? (
            !editing && (
              <button
                className="btn btn-ghost"
                onClick={() => setEditing(true)}
              >
                Edit profile
              </button>
            )
          ) : (
            <FollowButton userId={profile.id} onChange={load} />
          )}
        </div>
      </header>

      <div className="stats-row">
        <Stat label="Poems" value={poems.length} />
        <Stat label="Followers" value={profile.follower_count} />
        <Stat label="Following" value={profile.following_count} />
      </div>

      {editing ? (
        <form className="form profile-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line about you and your poetry"
              rows={3}
            />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        profile.bio && <p className="profile-bio">{profile.bio}</p>
      )}

      <div className="tabs profile-tabs">
        <button
          className={`tab${tab === 'poems' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'poems' })}
        >
          Poems
        </button>
        <button
          className={`tab${tab === 'reposts' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'reposts' })}
        >
          Reposts
        </button>
      </div>

      {tab === 'poems' ? (
        poems.length === 0 ? (
          <p className="muted">No public poems yet.</p>
        ) : (
          <div className="poem-list">
            {poems.map((poem) => (
              <PoemCard key={poem.id} poem={poem} onChange={load} />
            ))}
          </div>
        )
      ) : reposts.length === 0 ? (
        <p className="muted">No reposts yet.</p>
      ) : (
        <div className="poem-list">
          {reposts.map((r) => (
            <div key={r.id} className="repost-item">
              <span className="repost-label">
                🔁 {profile.display_name || profile.username} reposted
              </span>
              {r.poem && <PoemCard poem={r.poem} onChange={load} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
