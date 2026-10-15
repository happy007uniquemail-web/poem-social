import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const signInWithGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <p className="muted">
        Sign in to write poems, like your favourites, and build your repo.
      </p>
      <button
        className="btn btn-primary btn-google"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
