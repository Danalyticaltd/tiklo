import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import Footer from '../components/Footer'

const CITY_MAP = {
  ottawa: 'Ottawa',
  toronto: 'Toronto',
  montreal: 'Montreal',
  calgary: 'Calgary',
  vancouver: 'Vancouver',
  edmonton: 'Edmonton',
  winnipeg: 'Winnipeg',
  halifax: 'Halifax',
}

export default function CityEvents() {
  const { city: citySlug } = useParams()
  const { t } = useTranslation()
  const lp = useLangPath()
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
        <p className="text-muted text-lg">{t('cityEvents.cityNotFound')}</p>
        <Link to={lp('/')} className="text-primary hover:underline mt-4 inline-block">{t('cityEvents.backToAll')}</Link>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to={lp('/')} className="text-sm text-muted hover:text-gray-900 transition">{t('cityEvents.allCities')}</Link>
          <div className="flex items-center gap-2 mt-3">
            <MapPin size={20} className="text-primary" />
            <h1 className="font-heading text-3xl font-bold text-gray-900">{t('cityEvents.eventsIn', { city })}</h1>
          </div>
          <p className="text-muted text-sm mt-1">
            {loading ? t('cityEvents.loading') : t('cityEvents.upcoming', { count: events.length })}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-4">📍</p>
            <p className="text-muted text-lg">{t('cityEvents.noEvents', { city })}</p>
            <Link to={lp('/')} className="text-primary hover:underline text-sm mt-3 inline-block">{t('cityEvents.browseAll')}</Link>
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
