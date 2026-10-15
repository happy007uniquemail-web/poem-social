import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { USERNAME_FLAG_KEY } from '../lib/username'

const USERNAME_RE = /^[a-z0-9_]{3,30}$/

export default function UsernameSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill display name from the Google profile
  useEffect(() => {
    if (!session) return
    const meta = session.user.user_metadata || {}
    const name = meta.full_name || meta.name || ''
    if (name) setDisplayName(name)
    const suggested = (meta.user_name || meta.preferred_username || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
    if (suggested) setUsername(suggested)
  }, [session])

  // Debounced availability check
  useEffect(() => {
    if (!USERNAME_RE.test(username)) {
      setAvailable(null)
      return
    }
    let cancelled = false
    setChecking(true)
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (cancelled) return
      setChecking(false)
      if (error) {
        setError(error.message)
        return
      }
      setAvailable(!data)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [username])

  const valid = USERNAME_RE.test(username)
  const canSave = valid && available && !saving

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !canSave) return
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ username, display_name: displayName || null })
      .eq('id', session.user.id)

    setSaving(false)
    if (error) {
      // Unique violation (race) or check violation
      if (error.code === '23505') {
        setAvailable(false)
        setError('That username was just taken. Please pick another.')
      } else {
        setError(error.message)
      }
      return
    }
    localStorage.setItem(USERNAME_FLAG_KEY, '1')
    navigate('/')
  }

  return (
    <div className="auth-card">
      <h1>Choose your username</h1>
      <p className="muted">
        Your username is public and appears on your poems. You can’t change it
        to something someone else has.
      </p>
      <form onSubmit={save} className="form">
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="e.g. midnight_rhyme"
            autoComplete="username"
          />
        </label>
        <div className="hint">
          {!valid && username.length > 0 && (
            <span className="error">
              3–30 characters: lowercase letters, numbers, underscores.
            </span>
          )}
          {valid && checking && <span>Checking…</span>}
          {valid && !checking && available && <span className="ok">Available ✓</span>}
          {valid && !checking && available === false && (
            <span className="error">Taken</span>
          )}
        </div>

        <label>
          Display name <span className="muted">(optional)</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name shown on your poems"
          />
        </label>

        <button className="btn btn-primary" disabled={!canSave}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
