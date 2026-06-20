import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Flame, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import EventCarousel from '../components/EventCarousel'
import WordOfDay from '../components/WordOfDay'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const TAGS = ['All Communities', 'African', 'Caribbean', 'South Asian', 'Latin', 'Other']
const COMMUNITY_ORDER = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']

const COMMUNITY_PILLS = ['Afrobeats', 'Carnival', 'Bollywood', 'Reggae', 'Salsa', 'Highlife', 'Soca', 'Bhangra', 'Latin Jazz', 'Zouk']

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All Communities')
  const [search, setSearch] = useState('')

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

  const visible = search.trim()
    ? events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : events

  const hotEvents = [...events]
    .filter(e => (e.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0) >= 1)
    .sort((a, b) => {
      const sa = (a.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      const sb = (b.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      return sb - sa
    })
    .slice(0, 6)

  const isFiltered = city !== 'All Cities' || tag !== 'All Communities' || search.trim()

  const byCommunity = COMMUNITY_ORDER
    .map(community => ({
      community,
      events: visible.filter(e => e.community_tag === community),
    }))
    .filter(g => g.events.length > 0)

  const uncategorised = visible.filter(e => !COMMUNITY_ORDER.includes(e.community_tag))

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        {/* background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-24 flex flex-col md:flex-row items-center gap-12">
          {/* Left — copy */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-primary/30 uppercase tracking-widest">
              Multicultural Canada
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] mb-6">
              Your culture.<br />
              Your events.<br />
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">Your tickets.</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg max-w-md leading-relaxed mb-8">
              African, Caribbean, South Asian, Latin — discover the events that feel like home, right here in Canada.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#events" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-orange-400 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition shadow-lg shadow-primary/30 text-sm">
                Browse events <ArrowRight size={15} />
              </a>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition text-sm">
                Host an event
              </Link>
            </div>
          </motion.div>

          {/* Right — floating pills visual */}
          <motion.div
            className="flex-1 hidden md:flex flex-wrap gap-2 max-w-sm justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            {COMMUNITY_PILLS.map((pill, i) => (
              <motion.span
                key={pill}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-gray-300 backdrop-blur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                {pill}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── WORD OF THE DAY ── */}
      <div className="max-w-6xl mx-auto px-4 mt-8 mb-4">
        <WordOfDay />
      </div>

      {/* ── SEARCH + FILTERS ── */}
      <div id="events" className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events, artists, bands..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition text-sm"
            />
          </div>
          <select value={city} onChange={e => setCity(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary transition min-w-[140px]">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tag} onChange={e => setTag(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary transition min-w-[160px]">
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── HOT RIGHT NOW ── */}
      {!isFiltered && hotEvents.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-2 mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame size={18} className="text-orange-500" />
            <h2 className="font-heading font-bold text-gray-900 text-xl">Hot right now</h2>
            <span className="text-muted text-sm">- selling fast</span>
          </div>
          <EventCarousel events={hotEvents} />
        </div>
      )}

      {/* ── EVENT SECTIONS ── */}
      <div className="max-w-6xl mx-auto px-4 pb-16 space-y-14">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
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
            {byCommunity.map(({ community, events: evts }) => (
              <section key={community} className="relative px-6">
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="font-heading font-bold text-gray-900 text-xl">{community}</h2>
                  <span className="text-muted text-sm">- {evts.length} event{evts.length !== 1 ? 's' : ''}</span>
                </div>
                <EventCarousel events={evts} />
              </section>
            ))}
            {uncategorised.length > 0 && (
              <section className="relative px-6">
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="font-heading font-bold text-gray-900 text-xl">More events</h2>
                </div>
                <EventCarousel events={uncategorised} />
              </section>
            )}
          </>
        )}
      </div>

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  )
}
