import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Flame, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import EventCarousel from '../components/EventCarousel'
import HowItWorks from '../components/HowItWorks'
import WhyTiklo from '../components/WhyTiklo'
import Footer from '../components/Footer'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const EVENT_TYPE_CHIPS = ['Cultural show', 'Community event', 'Concert', 'Meetup', 'Workshop', 'Conference', 'Festival', 'Fundraiser', 'Seminar', 'Sport Event', 'Networking']
const HERO_WORDS = ['event', 'meetup', 'workshop', 'conference', 'festival', 'fundraiser', 'seminar', 'cultural show']

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All Communities')
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [communityChips, setCommunityChips] = useState([])
  const [heroWord, setHeroWord] = useState(0)

  // Fetch top community tags dynamically from published events
  useEffect(() => {
    async function fetchCommunities() {
      const { data } = await supabase
        .from('events')
        .select('community_tag')
        .eq('status', 'published')
        .not('community_tag', 'is', null)
      if (!data) return
      const counts = {}
      data.forEach(e => { if (e.community_tag) counts[e.community_tag] = (counts[e.community_tag] || 0) + 1 })
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
      setCommunityChips(sorted.slice(0, 8))
    }
    fetchCommunities()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setHeroWord(w => (w + 1) % HERO_WORDS.length), 2600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*, ticket_types(price, quantity_sold)')
        .eq('status', 'published')
        .order('event_date', { ascending: true })

      if (city !== 'All Cities') query = query.eq('city', city)
      if (tag !== 'All Communities') query = query.eq('community_tag', tag)

      const { data } = await query
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [city, tag])

  function handleChip(chip) {
    if (activeChip === chip) {
      setActiveChip(null)
      setTag('All Communities')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setActiveChip(chip)
    if (chip !== 'Free events' && chip !== 'This weekend') {
      setTag(chip)
    } else {
      setTag('All Communities')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTypeChip(type) {
    setActiveType(t => t === type ? null : type)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearFilters() {
    setActiveChip(null)
    setActiveType(null)
    setTag('All Communities')
    setCity('All Cities')
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const communityFiltered = activeChip && activeChip !== 'Free events' && activeChip !== 'This weekend'

  const visible = (() => {
    let evts = events
    if (search.trim()) {
      evts = evts.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    }
    if (activeChip === 'Free events') {
      evts = evts.filter(e => (e.ticket_types ?? []).some(t => Number(t.price) === 0))
    }
    if (activeChip === 'This weekend') {
      const now = new Date()
      const friday = new Date(now); friday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7)
      const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2)
      sunday.setHours(23, 59, 59)
      evts = evts.filter(e => { const d = new Date(e.event_date); return d >= friday && d <= sunday })
    }
    if (activeType) {
      evts = evts.filter(e => e.event_type?.toLowerCase() === activeType.toLowerCase())
    }
    return evts
  })()

  const hotEvents = [...events]
    .filter(e => (e.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0) >= 1)
    .sort((a, b) => {
      const sa = (a.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      const sb = (b.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      return sb - sa
    })
    .slice(0, 6)

  const isFiltered = city !== 'All Cities' || tag !== 'All Communities' || search.trim() || activeChip || activeType

  const hotIds = new Set(hotEvents.map(e => e.id))

  // Group by event type, excluding events already featured in "Hot right now"
  const belowFold = isFiltered ? visible : visible.filter(e => !hotIds.has(e.id))
  const distinctTypes = [...new Set(belowFold.map(e => e.event_type).filter(Boolean))]
  const orderedTypes = [
    ...EVENT_TYPE_CHIPS.filter(t => distinctTypes.includes(t)),
    ...distinctTypes.filter(t => !EVENT_TYPE_CHIPS.includes(t)),
  ]
  const byType = orderedTypes.map(type => ({
    type,
    events: belowFold.filter(e => e.event_type === type),
  })).filter(g => g.events.length > 0)

  const uncategorised = belowFold.filter(e => !e.event_type)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ── */}
      <section className="bg-white border-b border-gray-100 py-14 px-4 text-center">
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Canada's Event Ticketing Platform</p>
        <h1 className="font-heading text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Sell Event Tickets<br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Online in Minutes</span>
        </h1>
        <p className="text-muted text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
          Canada's simple ticketing platform for cultural events, concerts, conferences, fundraisers, festivals, and community gatherings.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link
            to="/register"
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md shadow-primary/20 text-sm"
          >
            Create Your Event
          </Link>
          <a
            href="#events"
            className="border border-gray-200 hover:border-primary text-gray-700 hover:text-primary font-semibold px-6 py-3 rounded-xl transition text-sm"
          >
            Browse Events
          </a>
        </div>

        {/* Search bar */}
        <div className="flex max-w-2xl mx-auto rounded-xl overflow-hidden border border-gray-200 shadow-md bg-white">
          <div className="flex items-center gap-2 flex-1 px-4">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, artists, bands..."
              className="flex-1 py-3.5 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
          </div>
          <div className="w-px bg-gray-200 my-2.5" />
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="px-3 py-3.5 text-sm text-gray-600 bg-transparent outline-none border-none"
          >
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-3 sm:px-6 transition shrink-0 flex items-center gap-1.5"
          >
            <Search size={15} className="shrink-0" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Community chips (dynamic) + static chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {[...communityChips, 'Free events', 'This weekend'].map(chip => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                activeChip === chip
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Event type chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {EVENT_TYPE_CHIPS.map(type => (
            <button
              key={type}
              onClick={() => handleTypeChip(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                activeType === type
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {/* ── HOT RIGHT NOW ── */}
      {!isFiltered && hotEvents.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-8 mb-10">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-heading font-bold text-gray-900 text-2xl flex items-center gap-2">
              <Flame size={20} className="text-orange-500" /> Hot right now
            </h2>
            <span className="text-sm text-muted">Selling fast</span>
          </div>
          <EventCarousel events={hotEvents} />
        </div>
      )}

      {/* ── ACTIVE FILTER BANNER ── */}
      {isFiltered && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            <ChevronLeft size={15} /> Back to all events
          </button>
        </div>
      )}

      {/* ── EVENT SECTIONS ── */}
      <div id="events" className="max-w-5xl mx-auto px-4 pb-16 space-y-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🎟</p>
            <p className="text-muted text-lg">No events found.</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or filter.</p>
          </div>
        ) : isFiltered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <>
            {byType.map(({ type, events: evts }) => (
              <section key={type}>
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="min-w-0">
                    <h2 className="font-heading font-bold text-gray-900 text-xl sm:text-2xl truncate">
                      {type}s
                    </h2>
                    <p className="text-sm text-muted">{evts.length} event{evts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => handleTypeChip(type)}
                    className="text-sm text-primary font-medium hover:underline shrink-0 ml-4"
                  >
                    See all
                  </button>
                </div>
                <EventCarousel events={evts} />
              </section>
            ))}
            {uncategorised.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="font-heading font-bold text-gray-900 text-xl sm:text-2xl">More events</h2>
                </div>
                <EventCarousel events={uncategorised} />
              </section>
            )}
          </>
        )}
      </div>

      <WhyTiklo />
      <HowItWorks />
      <Footer />
    </div>
  )
}
