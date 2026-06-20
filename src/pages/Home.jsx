import { useEffect, useState } from 'react'
import { Search, Flame, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import EventCarousel from '../components/EventCarousel'
import WordOfDay from '../components/WordOfDay'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const TAGS = ['All Communities', 'African', 'Caribbean', 'South Asian', 'Latin', 'Other']
const COMMUNITY_ORDER = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']

const HERO_WORDS = ['community', 'culture', 'people', 'diaspora', 'vibe']

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All Communities')
  const [search, setSearch] = useState('')
  const [heroWord, setHeroWord] = useState(0)

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

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-primary/20">
              <Sparkles size={12} />
              Tickets for multicultural Canada
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Events for your{' '}
              <motion.span
                key={heroWord}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              >
                {HERO_WORDS[heroWord]}
              </motion.span>
            </h1>
            <p className="text-muted mt-4 text-lg max-w-xl">
              African, Caribbean, South Asian, Latin and more — discover events and grab your spot before they sell out.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Word of the day */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <WordOfDay />
      </div>

      {/* Search + Filters */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
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

      {/* Hot right now — first section after search */}
      {!isFiltered && hotEvents.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4 mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame size={18} className="text-orange-500" />
            <h2 className="font-heading font-bold text-gray-900 text-xl">Hot right now</h2>
            <span className="text-muted text-sm">— selling fast</span>
          </div>
          <EventCarousel events={hotEvents} />
        </div>
      )}

      {/* Event sections */}
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
                  <span className="text-muted text-sm">· {evts.length} event{evts.length !== 1 ? 's' : ''}</span>
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
    </div>
  )
}
