import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TikloLogo from './TikloLogo'

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="border-b border-[#E3E8EE] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-[62px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/"><TikloLogo size={28} /></Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/#events" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">Browse Events</Link>
            <Link to={user ? "/dashboard" : "/register"} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">For Organizers</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">Admin</Link>
              )}
              <Link to="/dashboard" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">Dashboard</Link>

              {/* Avatar + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-primary/40 transition shrink-0 ml-1"
                  aria-label="Account menu"
                >
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : initials
                  }
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 w-52 bg-white rounded-xl border border-[#E3E8EE] shadow-xl py-1.5 z-50">
                    <div className="px-3 py-2.5 border-b border-[#E3E8EE]">
                      <p className="text-xs font-semibold text-navy truncate">{profile?.full_name || 'Organiser'}</p>
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-sm text-navy hover:bg-surface transition"
                    >
                      Profile &amp; settings
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-sm text-navy hover:bg-surface transition"
                    >
                      Dashboard
                    </Link>
                    <div className="border-t border-[#E3E8EE] mt-1 pt-1">
                      <button
                        onClick={() => { setMenuOpen(false); logout() }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
