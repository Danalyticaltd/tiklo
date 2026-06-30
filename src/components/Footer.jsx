import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from './TikloLogo'
import { supabase } from '../lib/supabase'

function FooterNavLink({ to, children, className }) {
  const navigate = useNavigate()
  function handleClick(e) {
    e.preventDefault()
    navigate(to)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }
  return (
    <a href={to} onClick={handleClick} className={className ?? 'text-sm text-white/45 hover:text-white/80 transition'}>
      {children}
    </a>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const lp = useLangPath()
  const [categories, setCategories] = useState([])
  const [cities, setCities] = useState([])

  useEffect(() => {
    supabase
      .from('events')
      .select('event_type')
      .eq('status', 'published')
      .not('event_type', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const counts = {}
        data.forEach(e => { if (e.event_type) counts[e.event_type] = (counts[e.event_type] || 0) + 1 })
        setCategories(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 6))
      })

    supabase
      .from('events')
      .select('city')
      .eq('status', 'published')
      .not('city', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const unique = [...new Set(data.map(e => e.city).filter(Boolean))].sort()
        setCities(unique)
      })
  }, [])

  return (
    <footer className="bg-navy">
      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        <div className="lg:col-span-1">
          <div className="mb-4"><TikloLogo size={26} light /></div>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">{t('footer.tagline')}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{t('footer.eventsByCity')}</p>
          <ul className="space-y-2.5">
            {cities.length > 0 ? cities.map(c => (
              <li key={c}>
                <FooterNavLink to={lp(`/?city=${encodeURIComponent(c)}`)}>{t('footer.eventsIn', { city: c })}</FooterNavLink>
              </li>
            )) : (
              <li className="text-sm text-white/25">{t('footer.comingSoon')}</li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{t('footer.organisers')}</p>
          <ul className="space-y-2.5">
            <li><FooterNavLink to={lp('/')}>{t('footer.browseEvents')}</FooterNavLink></li>
            <li><FooterNavLink to={lp('/register')}>{t('footer.createEvent')}</FooterNavLink></li>
            <li><FooterNavLink to={lp('/dashboard')}>{t('footer.dashboard')}</FooterNavLink></li>
            <li><a href="mailto:hello@tiklo.ca" className="text-sm text-white/45 hover:text-white/80 transition">{t('footer.contact')}</a></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{t('footer.categories')}</p>
          <ul className="space-y-2.5">
            {categories.length > 0 ? categories.map(cat => (
              <li key={cat}>
                <FooterNavLink to={lp(`/?eventType=${encodeURIComponent(cat)}`)}>{cat}</FooterNavLink>
              </li>
            )) : (
              <li className="text-sm text-white/25">{t('footer.comingSoon')}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-white/25">{t('footer.allRights', { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-4">
            <FooterNavLink to={lp('/my-tickets')} className="text-xs text-white/30 hover:text-white/60 transition">{t('footer.findTickets')}</FooterNavLink>
            <span className="text-xs text-white/25">{t('footer.madeWith')} <a href="https://www.danalytica.ca" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition underline underline-offset-2">Danalytica Ltd</a></span>
          </div>
        </div>
      </div>
    </footer>
  )
}
