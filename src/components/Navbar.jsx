import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TikloLogo from './TikloLogo'

export default function Navbar() {
  const { user, profile, logout } = useAuth()

  return (
    <nav className="border-b border-[#E3E8EE] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-[62px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/"><TikloLogo size={28} /></Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/#events" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">Browse Events</Link>
            <Link to="/register" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">For Organizers</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">Admin</Link>
              )}
              <Link to="/dashboard" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">Dashboard</Link>
              <button onClick={logout} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-navy px-3 py-1.5 transition hover:text-primary">Sign in</Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-primary hover:bg-[#574BFF] text-white px-5 py-2 rounded-xl transition shadow-sm shadow-primary/20"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
