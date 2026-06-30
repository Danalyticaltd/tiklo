import Footer from '../components/Footer'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { MapPin, Calendar, Tag, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function EventPage() {
  const { slug: eventId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lp = useLangPath()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [organiser, setOrganiser] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (!ev) { navigate(lp('/')); return }
      setEvent(ev)

      document.title = `${ev.title} | Tiklo`
      setMeta('description', ev.description ?? `${ev.title} - Buy tickets on Tiklo`)
      setMeta('og:title', ev.title)
      setMeta('og:description', ev.description ?? `${ev.title} - Buy tickets on Tiklo`)
      setMeta('og:url', `https://tiklo.ca/events/${eventId}`)
      setMeta('og:type', 'event')
      if (ev.banner_url) setMeta('og:image', ev.banner_url)
      setMeta('twitter:title', ev.title)
      setMeta('twitter:description', ev.description ?? ev.title)
      if (ev.banner_url) setMeta('twitter:image', ev.banner_url)
      setMeta('twitter:card', ev.banner_url ? 'summary_large_image' : 'summary')

      const [{ data: tt }, { data: org }] = await Promise.all([
        supabase.from('ticket_types').select('*').eq('event_id', eventId),
        supabase.from('profiles').select('full_name, avatar_url, bio').eq('id', ev.organizer_id).single(),
      ])
      setTicketTypes(tt ?? [])
      setOrganiser(org ?? null)
      if (tt?.length) setSelected(tt[0].id)

      const minPrice = tt?.length ? Math.min(...tt.map(t => Number(t.price))) : 0
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: ev.title,
        startDate: ev.event_date,
        description: ev.description ?? ev.title,
        url: `https://tiklo.ca/events/${eventId}`,
        location: ev.location ? {
          '@type': 'Place',
          name: ev.location,
          address: { '@type': 'PostalAddress', addressLocality: ev.city, addressCountry: 'CA' },
        } : { '@type': 'VirtualLocation' },
        ...(ev.banner_url && { image: ev.banner_url }),
        organizer: { '@type': 'Organization', name: org?.full_name ?? 'Tiklo Organizer' },
        offers: tt?.length ? {
          '@type': 'Offer',
          url: `https://tiklo.ca/events/${eventId}`,
          price: minPrice,
          priceCurrency: 'CAD',
          availability: 'https://schema.org/InStock',
          validFrom: ev.created_at,
        } : undefined,
      }
      let ldEl = document.querySelector('script[type="application/ld+json"]')
      if (!ldEl) { ldEl = document.createElement('script'); ldEl.type = 'application/ld+json'; document.head.appendChild(ldEl) }
      ldEl.textContent = JSON.stringify(jsonLd)

      setLoading(false)
    }
    load()
    return () => {
      document.title = 'Tiklo - Event Ticketing'
      setMeta('og:title', 'Tiklo - Event Ticketing')
      document.querySelector('script[type="application/ld+json"]')?.remove()
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
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-8 bg-gray-100 rounded-lg w-2/3 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  )

  const selectedType = ticketTypes.find(t => t.id === selected)
  const available = selectedType ? selectedType.quantity - selectedType.quantity_sold : 0
  const maxPerOrder = selectedType ? Math.min(available, selectedType.max_per_order ?? 10) : 1

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <Link to={lp('/')} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition">
          <ChevronLeft size={14} /> {t('eventPage.back')}
        </Link>
      </div>

      {event.banner_url && (
        <div className="max-w-3xl mx-auto px-4 pt-6 flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0 w-full sm:w-52">
            <img src={event.banner_url} alt={event.title} className="w-full rounded-2xl object-cover shadow-lg border border-gray-100" style={{ maxHeight: 320 }} />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {user && <Badge status={event.status} />}
            <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-full">{event.community_tag}</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900">{event.title}</h1>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted font-medium">{t('eventPage.share')}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(`https://tiklo.ca/events/${eventId}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="px-3 py-1 rounded-lg bg-surface text-navy text-xs font-medium hover:bg-gray-200 transition border border-[#E3E8EE]"
            >
              {copied ? t('eventPage.copied') : t('eventPage.copyLink')}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${event.title} — Get tickets: https://tiklo.ca/events/${eventId}`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:opacity-90 transition">WhatsApp</a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(`https://tiklo.ca/events/${eventId}`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg bg-black text-white text-xs font-medium hover:opacity-90 transition">𝕏 Twitter</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://tiklo.ca/events/${eventId}`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg bg-[#1877F2] text-white text-xs font-medium hover:opacity-90 transition">Facebook</a>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Calendar size={15} />
              <span>{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy - h:mm a')}</span>
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

        {event.description && (
          <div>
            <h2 className="font-heading font-bold text-gray-900 mb-2">{t('eventPage.about')}</h2>
            <p className="text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {organiser && (
          <div className="flex items-center gap-3 py-4 border-t border-gray-100">
            {organiser.avatar_url
              ? <img src={organiser.avatar_url} alt={organiser.full_name} className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0" />
              : <div className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 text-gray-400 font-semibold text-sm">
                  {(organiser.full_name ?? 'O')[0].toUpperCase()}
                </div>
            }
            <div>
              <p className="text-xs text-muted">{t('eventPage.organisedBy')}</p>
              <p className="text-sm font-semibold text-gray-900">{organiser.full_name ?? t('eventPage.organisedBy')}</p>
              {organiser.bio && <p className="text-xs text-muted mt-0.5 line-clamp-2">{organiser.bio}</p>}
            </div>
          </div>
        )}

        {ticketTypes.length > 0 && (() => {
          const allSoldOut = ticketTypes.every(tt => (tt.quantity - tt.quantity_sold) <= 0)
          return (
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">{allSoldOut ? t('eventPage.soldOut') : t('eventPage.getTickets')}</h2>
            {allSoldOut && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-medium">
                {t('eventPage.allSoldOut')}
              </p>
            )}
            <div className="space-y-2">
              {ticketTypes.map(tt => {
                const avail = tt.quantity - tt.quantity_sold
                const soldOut = avail <= 0
                function availLabel() {
                  if (soldOut) return null
                  if (avail <= tt.quantity / 4) return { text: t('eventPage.almostSoldOut'), color: '#ef4444' }
                  if (avail <= tt.quantity / 2) return { text: t('eventPage.sellingFast'), color: '#d97706' }
                  return { text: t('eventPage.available'), color: '#6B6355' }
                }
                const label = availLabel()
                return (
                  <button
                    key={tt.id}
                    disabled={soldOut}
                    onClick={() => { setSelected(tt.id); setQty(1) }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-left
                      ${soldOut ? 'border-gray-100 opacity-40 cursor-not-allowed' : selected === tt.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <div>
                      <p className="text-gray-900 font-medium text-sm">{tt.name}</p>
                      {soldOut
                        ? <p className="text-red-500 text-xs font-medium">{t('eventPage.soldOut')}</p>
                        : <p className="text-xs font-medium" style={{ color: label.color }}>{label.text}</p>
                      }
                    </div>
                    <p className="font-heading font-bold text-gray-900">
                      {tt.price === 0 ? t('eventPage.free') : `$${Number(tt.price).toFixed(2)}`}
                    </p>
                  </button>
                )
              })}
            </div>

            {selectedType && available > 0 && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:border-primary transition flex items-center justify-center text-lg">-</button>
                  <span className="w-8 text-center text-gray-900 font-medium">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(maxPerOrder, q + 1))} className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:border-primary transition flex items-center justify-center text-lg">+</button>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <button
                    className="w-full bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-primary/20 text-sm"
                    onClick={() => navigate(`${lp('/checkout')}/${eventId}?tt=${selected}&qty=${qty}`)}
                  >
                    {selectedType.price === 0 ? t('eventPage.registerFree') : t('eventPage.buy', { total: (selectedType.price * qty).toFixed(2) })}
                  </button>
                  {(selectedType.max_per_order ?? 10) < available && (
                    <p className="text-xs text-muted text-center">{t('eventPage.maxPerOrder', { count: selectedType.max_per_order ?? 10 })}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          )
        })()}
      </div>
      <Footer />
    </div>
  )
}
