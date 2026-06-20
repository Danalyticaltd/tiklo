import { useEffect, useState, useCallback } from 'react'
import { Search, Flame, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import WordOfWeek from '../components/WordOfWeek'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const TAGS = ['All Communities', 'African', 'Caribbean', 'South Asian', 'Latin', 'Other']

const HERO_WORDS = ['community', 'culture', 'people', 'diaspora', 'vibe']

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All Communities')
  const [search, setSearch] = useState('')
  const [heroWord, setHeroWord] = useState(0)

  // Cycle hero words
  useEffect(() => {
    const t = setInterval(() => setHeroWord(w => (w + 1) % HERO_WORDS.length), 2800)
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

  const visible = search.trim()
    ? events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : events

  // Hot events: most tickets sold
  const hotEvents = [...events]
    .filter(e => (e.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0) >= 1)
    .sort((a, b) => {
      const sa = (a.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      const sb = (b.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
      return sb - sa
    })
    .slice(0, 3)

  // Poster wall: events with banners
  const posterEvents = events.filter(e => e.banner_url).slice(0, 8)

  const isFiltered = city !== 'All Cities' || tag !== 'All Communities' || search.trim()

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-primary/20">
              <Sparkles size={12} />
              Tickets for multicultural Canada
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Events for your{' '}
              <span className="relative inline-block">
                <motion.span
                  key={heroWord}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                >
                  {HERO_WORDS[heroWord]}
                </motion.span>
              </span>
            </h1>
            <p className="text-muted mt-4 text-lg max-w-xl">
              African, Caribbean, South Asian, Latin and more — discover events and grab your spot before they sell out.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Word of the week ── */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <WordOfWeek />
      </div>

      {/* ── Hot right now ── */}
      {!isFiltered && hotEvents.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-orange-500" />
            <h2 className="font-heading font-bold text-gray-900 text-xl">Hot right now</h2>
            <span className="text-muted text-sm">— selling fast</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hotEvents.map(event => <EventCard key={event.id} event={event} featured />)}
          </div>
        </div>
      )}

      {/* ── Poster wall ── */}
      {!isFiltered && posterEvents.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎨</span>
            <h2 className="font-heading font-bold text-gray-900 text-xl">Event flyers</h2>
            <span className="text-muted text-sm">— tap to get tickets</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {posterEvents.map(event => (
              <a
                key={event.id}
                href={`/events/${event.id}`}
                className="shrink-0 snap-start group"
                style={{ width: 160 }}
              >
                <div className="relative rounded-xl overflow-hidden border border-gray-100 hover:border-primary/40 transition shadow-sm group-hover:shadow-lg" style={{ height: 240 }}>
                  <img
                    src={event.banner_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-2 right-2">
                    <p className="text-white text-xs font-bold line-clamp-2 leading-tight">{event.title}</p>
                    <p className="text-white/70 text-xs mt-0.5">{event.city}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, artists, bands…"
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

      {/* ── All events ── */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {!isFiltered && visible.length > 0 && (
          <h2 className="font-heading font-bold text-gray-900 text-xl mb-4">All upcoming events</h2>
        )}
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  )
}
