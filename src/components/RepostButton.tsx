import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function RepostButton({
  poemId,
  repostCount,
  onChange,
}: {
  poemId: string
  repostCount: number
  onChange?: () => void
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [reposted, setReposted] = useState(false)
  const [count, setCount] = useState(repostCount)
  const [busy, setBusy] = useState(false)

  useEffect(() => setCount(repostCount), [repostCount])

  useEffect(() => {
    if (!session) {
      setReposted(false)
      return
    }
    supabase
      .from('reposts')
      .select('id')
      .eq('poem_id', poemId)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setReposted(!!data))
  }, [session, poemId])

  const toggle = async () => {
    if (!session) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)

    const next = !reposted
    setReposted(next)
    setCount((c) => c + (next ? 1 : -1))

    let error
    if (next) {
      const { error: e } = await supabase
        .from('reposts')
        .insert({ poem_id: poemId, user_id: session.user.id })
      error = e
      if (e && e.code !== '23505') {
        setReposted(false)
        setCount((c) => c - 1)
      }
    } else {
      const { error: e } = await supabase
        .from('reposts')
        .delete()
        .eq('poem_id', poemId)
        .eq('user_id', session.user.id)
      error = e
      if (e) {
        setReposted(true)
        setCount((c) => c + 1)
      }
    }

    setBusy(false)
    if (!error) onChange?.()
  }

  return (
    <button
      className={`repost-btn${reposted ? ' reposted' : ''}`}
      onClick={toggle}
      aria-pressed={reposted}
      aria-label={reposted ? 'Undo repost' : 'Repost'}
      title={reposted ? 'Undo repost' : 'Repost to your followers'}
    >
      {reposted ? '🔁 Reposted' : '🔁 Repost'} {count > 0 && count}
    </button>
  )
}
