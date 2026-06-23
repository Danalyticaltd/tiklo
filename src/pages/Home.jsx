import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Flame, ChevronLeft, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import EventCarousel from '../components/EventCarousel'
import WhyTiklo from '../components/WhyTiklo'
import Footer from '../components/Footer'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const EVENT_TYPE_CHIPS = ['Cultural show', 'Community event', 'Concert', 'Meetup', 'Workshop', 'Conference', 'Festival', 'Fundraiser', 'Seminar', 'Sport Event', 'Networking']
const DOT_COLORS = ['bg-primary', 'bg-[#00D4FF]', 'bg-success']

export default function Home() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All Communities')
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [communityChips, setCommunityChips] = useState([])

  // Dashboard widget — real data
  const [dashStats, setDashStats] = useState({ ticketsSold: 0, activeEvents: 0 })
  const [dashEvents, setDashEvents] = useState([])

  // Apply ?eventType= URL param whenever it changes (footer category links)
  useEffect(() => {
    const type = searchParams.get('eventType')
    if (type) {
      setActiveType(type)
      setTimeout(() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [searchParams])

  // Fetch dashboard widget stats + real-time subscription
  useEffect(() => {
    async function fetchDashStats() {
      try {
        const [{ data: ttData }, { count }, { data: evData }] = await Promise.all([
          supabase.from('ticket_types').select('quantity_sold').eq('events.status', 'published'),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('events').select('id, title').eq('status', 'published').order('event_date', { ascending: true }).limit(3),
        ])
        const ticketsSold = (ttData ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
        setDashStats({ ticketsSold, activeEvents: count ?? 0 })
        setDashEvents(evData ?? [])
      } catch (err) {
        console.error('[fetchDashStats]', err)
      }
    }
    fetchDashStats()

    const channel = supabase
      .channel('home-dashboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ticket_types' }, fetchDashStats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function fetchCommunities() {
      const { data } = await supabase
        .from('events').select('community_tag').eq('status', 'published').not('community_tag', 'is', null)
      if (!data) return
      const counts = {}
      data.forEach(e => { if (e.community_tag) counts[e.community_tag] = (counts[e.community_tag] || 0) + 1 })
      setCommunityChips(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 8))
    }
    fetchCommunities()
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from('events').select('*, ticket_types(price, quantity_sold)')
        .eq('status', 'published').order('event_date', { ascending: true })
      if (city !== 'All Cities') query = query.eq('city', city)
      if (tag !== 'All Communities') query = query.eq('community_tag', tag)
      const { data } = await query
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [city, tag])

  function handleChip(chip) {
    if (activeChip === chip) { setActiveChip(null); setTag('All Communities'); return }
    setActiveChip(chip)
    if (chip !== 'Free events' && chip !== 'This weekend') setTag(chip)
    else setTag('All Communities')
  }

  function handleTypeChip(type) {
    setActiveType(t => t === type ? null : type)
  }

  function clearFilters() {
    setActiveChip(null); setActiveType(null)
    setTag('All Communities'); setCity('All Cities'); setSearch('')
    setSearchParams({})
  }

  const visible = (() => {
    let evts = events
    if (search.trim()) evts = evts.filter(e =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description ?? '').toLowerCase().includes(search.toLowerCase())
    )
    if (activeChip === 'Free events') evts = evts.filter(e => (e.ticket_types ?? []).some(t => Number(t.price) === 0))
    if (activeChip === 'This weekend') {
      const now = new Date()
      const friday = new Date(now); friday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7)
      const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2); sunday.setHours(23, 59, 59)
      evts = evts.filter(e => { const d = new Date(e.event_date); return d >= friday && d <= sunday })
    }
    if (activeType) evts = evts.filter(e => e.event_type?.toLowerCase() === activeType.toLowerCase())
    return evts
  })()

  const hotEvents = [...events]
    .filter(e => (e.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0) >= 1)
    .sort((a, b) => {
      const sa = (a.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      const sb = (b.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      return sb - sa
    }).slice(0, 6)

  const isFiltered = city !== 'All Cities' || tag !== 'All Communities' || search.trim() || activeChip || activeType
  const hotIds = new Set(hotEvents.map(e => e.id))
  const belowFold = isFiltered ? visible : visible.filter(e => !hotIds.has(e.id))
  const distinctTypes = [...new Set(belowFold.map(e => e.event_type).filter(Boolean))]
  const orderedTypes = [
    ...EVENT_TYPE_CHIPS.filter(t => distinctTypes.includes(t)),
    ...distinctTypes.filter(t => !EVENT_TYPE_CHIPS.includes(t)),
  ]
  const byType = orderedTypes.map(type => ({ type, events: belowFold.filter(e => e.event_type === type) })).filter(g => g.events.length > 0)
  const uncategorised = belowFold.filter(e => !e.event_type)

  const ctaTarget = user ? '/dashboard' : '/register'

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #635BFF 0%, #7C4DFF 55%, #00D4FF 100%)' }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, white, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, white, transparent 70%)', transform: 'translateY(40%)' }} />

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 flex flex-col lg:flex-row items-center gap-12">

          {/* Left */}
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] inline-block shrink-0" />
              <span className="text-white/80 text-xs font-semibold">Canada's Event Ticketing Platform</span>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-white leading-[1.08] tracking-tight mb-4">
              Sell Event Tickets<br />Online in Minutes.
            </h1>
            <p className="text-white/65 text-base leading-relaxed max-w-sm mb-8">
              Create your event, set pricing, and start collecting payments — no setup fees, no monthly cost.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link to={ctaTarget} className="bg-white text-primary font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/90 transition shadow-sm">
                {user ? 'Go to dashboard →' : 'Create your event →'}
              </Link>
              <a href="#search-section" className="bg-white/10 text-white border border-white/25 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-white/20 transition">
                Browse events
              </a>
            </div>
            <div className="flex gap-8 pt-6 border-t border-white/10">
              <div><p className="text-xl font-bold text-white">0%</p><p className="text-white/45 text-xs mt-0.5">Setup fee</p></div>
              <div><p className="text-xl font-bold text-white">5 min</p><p className="text-white/45 text-xs mt-0.5">To go live</p></div>
              <div><p className="text-xl font-bold text-white">🍁 CA</p><p className="text-white/45 text-xs mt-0.5">Canada-first</p></div>
            </div>
          </div>

          {/* Right — live dashboard widget */}
          <div className="hidden lg:block flex-shrink-0 w-72 relative z-10">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-5">
                <p className="text-[10px] font-bold text-navy uppercase tracking-widest mb-3">Live Platform Stats</p>
                <div className={`grid gap-2 mb-4 ${dashStats.ticketsSold >= 1000 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-navy">{dashStats.activeEvents}</p>
                    <p className="text-[10px] text-muted mt-0.5">Events live</p>
                  </div>
                  {dashStats.ticketsSold >= 1000 && (
                    <div className="bg-surface rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-primary">{dashStats.ticketsSold.toLocaleString()}</p>
                      <p className="text-[10px] text-muted mt-0.5">Tickets sold</p>
                    </div>
                  )}
                </div>
                {dashEvents.length > 0 ? dashEvents.map((ev, i) => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-center gap-2.5 py-2 border-b border-[#E3E8EE] last:border-0 hover:bg-surface rounded-lg px-1 -mx-1 transition">
                    <div className={`w-2 h-2 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]} shrink-0`} />
                    <span className="text-xs font-semibold text-navy flex-1 truncate">{ev.title}</span>
                    <span className="text-[10px] font-bold text-success bg-green-50 px-2 py-0.5 rounded-md shrink-0">Live →</span>
                  </Link>
                )) : (
                  <p className="text-xs text-muted text-center py-2">No events yet</p>
                )}
                <Link
                  to={user ? '/dashboard' : '/login'}
                  className="mt-3 bg-surface hover:bg-[#E3E8EE] rounded-xl p-3 flex items-center gap-3 transition"
                >
                  <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center shrink-0">
                    <QrCode size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-navy">QR Check-In Active</p>
                    <p className="text-[10px] text-muted">{user ? 'Go to dashboard →' : 'Sign in to start scanning →'}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEARCH + FILTERS ── */}
      <section id="search-section" className="scroll-mt-20 bg-white border-b border-[#E3E8EE] px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex max-w-2xl mx-auto rounded-xl overflow-hidden border border-[#E3E8EE] shadow-sm bg-white">
            <div className="flex items-center gap-2 flex-1 px-4">
              <Search size={15} className="text-muted shrink-0" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events, artists, bands..."
                className="flex-1 py-3.5 text-sm text-navy placeholder-muted bg-transparent outline-none"
              />
            </div>
            <div className="w-px bg-[#E3E8EE] my-2.5" />
            <select value={city} onChange={e => setCity(e.target.value)} className="px-3 py-3.5 text-sm text-muted bg-transparent outline-none border-none">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="bg-primary hover:bg-[#574BFF] text-white font-semibold text-sm px-4 sm:px-6 transition shrink-0 flex items-center gap-1.5">
              <Search size={15} className="shrink-0" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {communityChips.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {[...communityChips, 'Free events', 'This weekend'].map(chip => (
                <button key={chip} onClick={() => handleChip(chip)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${activeChip === chip ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-[#E3E8EE] text-muted hover:border-navy/30 hover:text-navy'}`}>
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_TYPE_CHIPS.map(type => (
              <button key={type} onClick={() => handleTypeChip(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${activeType === type ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-[#E3E8EE] text-muted hover:border-navy/30 hover:text-navy'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOT RIGHT NOW ── */}
      {!isFiltered && hotEvents.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-10 mb-10">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-heading font-bold text-navy text-2xl flex items-center gap-2">
              <Flame size={20} className="text-orange-500" /> Hot right now
            </h2>
            <span className="text-sm text-muted">Selling fast</span>
          </div>
          <EventCarousel events={hotEvents} />
        </div>
      )}

      {isFiltered && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            <ChevronLeft size={15} /> Back to all events
          </button>
        </div>
      )}

      {/* ── EVENT SECTIONS ── */}
      <div id="events" className="max-w-6xl mx-auto px-4 pb-16 space-y-12 mt-2">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-surface rounded-2xl h-64 animate-pulse border border-[#E3E8EE]" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🎟</p>
            <p className="text-muted text-lg">No events found.</p>
            <p className="text-muted/60 text-sm mt-1">Try a different search or filter.</p>
          </div>
        ) : isFiltered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {visible.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <>
            {byType.map(({ type, events: evts }) => (
              <section key={type}>
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="min-w-0">
                    <h2 className="font-heading font-bold text-navy text-xl sm:text-2xl truncate">{type}s</h2>
                    <p className="text-sm text-muted">{evts.length} event{evts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => handleTypeChip(type)} className="text-sm text-primary font-medium hover:underline shrink-0 ml-4">See all</button>
                </div>
                <EventCarousel events={evts} />
              </section>
            ))}
            {uncategorised.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="font-heading font-bold text-navy text-xl sm:text-2xl">More events</h2>
                </div>
                <EventCarousel events={uncategorised} />
              </section>
            )}
          </>
        )}
      </div>

      <WhyTiklo />

      {/* ── CTA BAND ── */}
      <section className="bg-navy px-4 py-20 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
          Ready to sell tickets?
        </h2>
        <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          Join Canadian event organisers already using Tiklo. It's free to start — no credit card required.
        </p>
        <Link
          to={ctaTarget}
          className="inline-block bg-primary hover:bg-[#574BFF] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition shadow-sm shadow-primary/30"
        >
          {user ? 'Go to your dashboard →' : 'Create your event — it\'s free'}
        </Link>
      </section>

      <Footer />
    </div>
  )
}
