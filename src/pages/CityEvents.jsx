import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import Footer from '../components/Footer'

const CITY_MAP = {
  ottawa: 'Ottawa',
  toronto: 'Toronto',
  montreal: 'Montreal',
  calgary: 'Calgary',
  vancouver: 'Vancouver',
}

export default function CityEvents() {
  const { city: citySlug } = useParams()
  const city = CITY_MAP[citySlug?.toLowerCase()]
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!city) return
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*, ticket_types(price, quantity_sold)')
        .eq('status', 'published')
        .eq('city', city)
        .order('event_date', { ascending: true })
      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [city])

  if (!city) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <p className="text-muted text-lg">City not found.</p>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">← Back to all events</Link>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/" className="text-sm text-muted hover:text-gray-900 transition">← All cities</Link>
          <div className="flex items-center gap-2 mt-3">
            <MapPin size={20} className="text-primary" />
            <h1 className="font-heading text-3xl font-bold text-gray-900">Events in {city}</h1>
          </div>
          <p className="text-muted text-sm mt-1">{loading ? '…' : `${events.length} upcoming event${events.length !== 1 ? 's' : ''}`}</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-4">📍</p>
            <p className="text-muted text-lg">No upcoming events in {city} yet.</p>
            <Link to="/" className="text-primary hover:underline text-sm mt-3 inline-block">Browse all events</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
