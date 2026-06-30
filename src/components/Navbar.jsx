import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from './TikloLogo'

function LangSwitcher() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  function switchTo(lang) {
    const path = location.pathname
    if (lang === 'fr' && !path.startsWith('/fr')) {
      navigate('/fr' + (path === '/' ? '' : path))
    } else if (lang === 'en' && path.startsWith('/fr')) {
      navigate(path.slice(3) || '/')
    }
  }

  const active = 'text-primary font-bold'
  const inactive = 'text-muted hover:text-navy'

  return (
    <div className="flex items-center gap-0.5 text-xs font-semibold">
      <button onClick={() => switchTo('en')} className={`px-1.5 py-0.5 rounded transition ${i18n.language === 'en' ? active : inactive}`}>EN</button>
      <span className="text-muted/40">|</span>
      <button onClick={() => switchTo('fr')} className={`px-1.5 py-0.5 rounded transition ${i18n.language === 'fr' ? active : inactive}`}>FR</button>
    </div>
  )
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const { t } = useTranslation()
  const lp = useLangPath()
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
    ? profile.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="border-b border-[#E3E8EE] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-[62px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to={lp('/')}><TikloLogo size={28} /></Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to={lp('/#events')} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">{t('nav.browse')}</Link>
            <Link to={lp(user ? '/dashboard' : '/register')} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">{t('nav.forOrganizers')}</Link>
            <Link to={lp('/how-it-works')} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 rounded-lg hover:bg-surface transition">{t('nav.howItWorks')}</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.role !== 'admin' && <LangSwitcher />}

          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">{t('nav.admin')}</Link>
              )}
              <Link to={lp('/dashboard')} className="text-sm font-medium text-muted hover:text-navy px-3 py-1.5 transition">{t('nav.dashboard')}</Link>

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
                      to={lp('/dashboard/profile')}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-sm text-navy hover:bg-surface transition"
                    >
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to={lp('/dashboard')}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-sm text-navy hover:bg-surface transition"
                    >
                      {t('nav.dashboard')}
                    </Link>
                    <div className="border-t border-[#E3E8EE] mt-1 pt-1">
                      <button
                        onClick={() => { setMenuOpen(false); logout() }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                      >
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to={lp('/login')} className="text-sm font-medium text-navy px-3 py-1.5 transition hover:text-primary">{t('nav.signIn')}</Link>
              <Link
                to={lp('/register')}
                className="text-sm font-semibold bg-primary hover:bg-[#574BFF] text-white px-5 py-2 rounded-xl transition shadow-sm shadow-primary/20"
              >
                {t('nav.signUpFree')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
