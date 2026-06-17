import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b border-slate-800 bg-bg/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-heading font-bold text-xl text-primary tracking-tight">Tiklo</Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted hover:text-slate-100 transition">Dashboard</Link>
              <button onClick={logout} className="text-sm text-muted hover:text-slate-100 transition">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted hover:text-slate-100 transition">Sign in</Link>
              <Link to="/register" className="text-sm bg-primary hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg transition font-medium">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
