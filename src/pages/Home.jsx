import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'

const CITIES = ['All Cities', 'Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const TAGS = ['All', 'African', 'Caribbean', 'South Asian', 'Latin', 'Other']

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('All Cities')
  const [tag, setTag] = useState('All')

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*, ticket_types(price)')
        .eq('status', 'published')
        .order('event_date', { ascending: true })

      if (city !== 'All Cities') query = query.eq('city', city)
      if (tag !== 'All') query = query.eq('community_tag', tag)

      const { data } = await query
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [city, tag])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-slate-100 leading-tight">
          Events for your <span className="text-primary">community</span>
        </h1>
        <p className="text-muted mt-3 text-lg">Discover multicultural events across Canada.</p>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 pb-4 min-w-max">
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border whitespace-nowrap ${city === c ? 'bg-primary border-primary text-white' : 'border-slate-700 text-muted hover:border-slate-500'}`}
            >
              {c}
            </button>
          ))}
          <div className="w-px bg-slate-700 mx-1 self-stretch" />
          {TAGS.map(t => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border whitespace-nowrap ${tag === t ? 'bg-accent/20 border-accent text-amber-400' : 'border-slate-700 text-muted hover:border-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Event grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted text-lg">No events found.</p>
            <p className="text-slate-600 text-sm mt-1">Try a different city or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  )
}
