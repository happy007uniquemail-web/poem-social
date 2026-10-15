import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function LikeButton({
  poemId,
  likeCount,
  onChange,
}: {
  poemId: string
  likeCount: number
  onChange?: () => void
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(likeCount)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setCount(likeCount)
  }, [likeCount])

  // Check whether the current user already liked this poem
  useEffect(() => {
    if (!session) return
    supabase
      .from('likes')
      .select('poem_id')
      .eq('poem_id', poemId)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [poemId, session])

  const toggle = async () => {
    if (!session) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)

    // Optimistic update
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))

    let error
    if (nextLiked) {
      const { error: e } = await supabase
        .from('likes')
        .insert({ poem_id: poemId, user_id: session.user.id })
      error = e
      // Unique-violation means it was already liked; treat as success
      if (e && e.code !== '23505') {
        setLiked(false)
        setCount((c) => c - 1)
      }
    } else {
      const { error: e } = await supabase
        .from('likes')
        .delete()
        .eq('poem_id', poemId)
        .eq('user_id', session.user.id)
      error = e
      if (e) {
        setLiked(true)
        setCount((c) => c + 1)
      }
    }

    setBusy(false)
    if (!error) onChange?.()
  }

  return (
    <button
      className={`like-btn${liked ? ' liked' : ''}`}
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike poem' : 'Like poem'}
    >
      {liked ? '♥' : '♡'} {count}
    </button>
  )
}
