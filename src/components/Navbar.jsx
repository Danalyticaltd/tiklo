import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-heading font-bold text-2xl tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Tiklo</Link>
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted hover:text-gray-900 transition font-medium">Dashboard</Link>
              <button onClick={logout} className="text-sm text-muted hover:text-gray-900 transition">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted hover:text-gray-900 transition font-medium">Sign in</Link>
              <Link to="/register" className="text-sm bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white px-4 py-2 rounded-xl transition font-semibold shadow-lg shadow-primary/20">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
