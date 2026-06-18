import { useEffect, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const TAGS = ['All Communities', 'African', 'Caribbean', 'South Asian', 'Latin', 'Other']

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
        .select('*, ticket_types(price)')
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

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-10">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            Events for your{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              community
            </span>
          </h1>
          <p className="text-muted mt-4 text-lg max-w-xl">Discover and buy tickets for multicultural events across Canada — African, Caribbean, South Asian, Latin and more.</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
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

          {/* City dropdown */}
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary transition min-w-[140px]"
          >
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Community dropdown */}
          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary transition min-w-[160px]"
          >
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Event grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24">
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
