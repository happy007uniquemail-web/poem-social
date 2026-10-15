import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function FollowButton({
  userId,
  onChange,
}: {
  userId: string
  onChange?: () => void
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) {
      setFollowing(false)
      return
    }
    supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', session.user.id)
      .eq('followee_id', userId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [session, userId])

  // Don't let users follow themselves
  const isSelf = !!session && session.user.id === userId
  if (isSelf) return null

  const toggle = async () => {
    if (!session) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)

    const next = !following
    setFollowing(next)

    let error
    if (next) {
      const { error: e } = await supabase
        .from('follows')
        .insert({ follower_id: session.user.id, followee_id: userId })
      error = e
      if (e && e.code !== '23505') {
        setFollowing(false)
      }
    } else {
      const { error: e } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('followee_id', userId)
      error = e
      if (e) setFollowing(true)
    }

    setBusy(false)
    if (!error) onChange?.()
  }

  return (
    <button
      className={`btn ${following ? 'btn-ghost' : 'btn-primary'}`}
      onClick={toggle}
      disabled={busy}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
