import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Layout() {
  const { session, signOut } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Poem Repo
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Feed
          </NavLink>
          {session && (
            <>
              <NavLink to="/my-poems">My Poems</NavLink>
              <NavLink to="/liked">Liked</NavLink>
              <NavLink to="/write" className="nav-cta">
                Write
              </NavLink>
            </>
          )}
        </nav>
        <div className="auth-area">
          {session ? (
            <button className="btn btn-ghost" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
