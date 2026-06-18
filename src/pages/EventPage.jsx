import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { MapPin, Calendar, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function EventPage() {
  const { slug: eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (!ev) { navigate('/'); return }
      setEvent(ev)

      // Dynamic SEO meta tags
      document.title = `${ev.title} — Tiklo`
      setMeta('description', ev.description ?? `${ev.title} — Buy tickets on Tiklo`)
      setMeta('og:title', ev.title)
      setMeta('og:description', ev.description ?? `${ev.title} — Buy tickets on Tiklo`)
      setMeta('og:url', `https://tiklo.ca/events/${eventId}`)
      setMeta('og:type', 'event')
      if (ev.banner_url) setMeta('og:image', ev.banner_url)
      setMeta('twitter:title', ev.title)
      setMeta('twitter:description', ev.description ?? ev.title)
      if (ev.banner_url) setMeta('twitter:image', ev.banner_url)

      const { data: tt } = await supabase.from('ticket_types').select('*').eq('event_id', eventId)
      setTicketTypes(tt ?? [])
      if (tt?.length) setSelected(tt[0].id)
      setLoading(false)
    }
    load()
    return () => {
      document.title = 'Tiklo — Event Ticketing'
      setMeta('og:title', 'Tiklo — Event Ticketing')
    }
  }, [eventId, navigate])

  function setMeta(property, content) {
    const isOg = property.startsWith('og:') || property.startsWith('twitter:')
    const attr = isOg ? 'property' : 'name'
    let el = document.querySelector(`meta[${attr}="${property}"]`)
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, property); document.head.appendChild(el) }
    el.setAttribute('content', content)
  }

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-10 space-y-4">
        <div className="h-72 bg-surface rounded-2xl animate-pulse" />
        <div className="h-8 bg-surface rounded-lg w-2/3 animate-pulse" />
        <div className="h-4 bg-surface rounded w-1/3 animate-pulse" />
      </div>
    </div>
  )

  const selectedType = ticketTypes.find(t => t.id === selected)
  const available = selectedType ? selectedType.quantity - selectedType.quantity_sold : 0

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Banner */}
      {event.banner_url && (
        <div className="w-full max-h-80 overflow-hidden">
          <img src={event.banner_url} alt={event.title} className="w-full object-cover max-h-80" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {user && <Badge status={event.status} />}
            <span className="text-xs text-muted bg-slate-800 px-2 py-0.5 rounded-full">{event.community_tag}</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-100">{event.title}</h1>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Calendar size={15} />
              <span>{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy · h:mm a')}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-muted text-sm">
                <MapPin size={15} />
                <span>{event.location}{event.city ? `, ${event.city}` : ''}</span>
              </div>
            )}
            {event.community_tag && (
              <div className="flex items-center gap-2 text-muted text-sm">
                <Tag size={15} />
                <span>{event.community_tag}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h2 className="font-heading font-bold text-slate-100 mb-2">About</h2>
            <p className="text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Ticket selector */}
        {ticketTypes.length > 0 && (
          <div className="bg-surface rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-slate-100">Get tickets</h2>

            <div className="space-y-2">
              {ticketTypes.map(tt => {
                const avail = tt.quantity - tt.quantity_sold
                const soldOut = avail <= 0
                function availLabel() {
                  if (soldOut) return null
                  if (avail <= tt.quantity / 4) return { text: 'Almost sold out!', color: '#ef4444' }
                  if (avail <= tt.quantity / 2) return { text: 'Selling fast — grab yours', color: '#f59e0b' }
                  return { text: 'Tickets available', color: '#94a3b8' }
                }
                const label = availLabel()
                return (
                  <button
                    key={tt.id}
                    disabled={soldOut}
                    onClick={() => { setSelected(tt.id); setQty(1) }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-left
                      ${soldOut ? 'border-slate-800 opacity-40 cursor-not-allowed' : selected === tt.id ? 'border-primary bg-primary/10' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    <div>
                      <p className="text-slate-100 font-medium text-sm">{tt.name}</p>
                      {soldOut
                        ? <p className="text-red-400 text-xs font-medium">Sold out</p>
                        : <p className="text-xs font-medium" style={{ color: label.color }}>{label.text}</p>
                      }
                    </div>
                    <p className="font-heading font-bold text-slate-100">
                      {tt.price === 0 ? 'Free' : `$${Number(tt.price).toFixed(2)}`}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Quantity + CTA */}
            {selectedType && available > 0 && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-slate-700 text-slate-100 hover:border-primary transition flex items-center justify-center text-lg">−</button>
                  <span className="w-8 text-center text-slate-100 font-medium">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(available, q + 1))} className="w-8 h-8 rounded-full border border-slate-700 text-slate-100 hover:border-primary transition flex items-center justify-center text-lg">+</button>
                </div>
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/checkout/${eventId}?tt=${selected}&qty=${qty}`)}
                >
                  {selectedType.price === 0 ? 'Register free' : `Buy · $${(selectedType.price * qty).toFixed(2)}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
