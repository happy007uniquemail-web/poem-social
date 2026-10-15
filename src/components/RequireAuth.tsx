import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
