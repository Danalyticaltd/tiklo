import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { MapPin, Calendar } from 'lucide-react'
import Badge from './ui/Badge'

export default function EventCard({ event }) {
  const { id, title, event_date, location, city, community_tag, banner_url, status, ticket_types } = event

  const minPrice = ticket_types?.length
    ? Math.min(...ticket_types.map(t => Number(t.price ?? 0)))
    : null

  const priceLabel = minPrice === null ? null
    : minPrice === 0 ? 'Free'
    : `From $${minPrice.toFixed(2)}`

  return (
    <Link to={`/events/${id}`} className="block bg-surface rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary transition group">
      <div className="relative h-44 bg-slate-800">
        {banner_url
          ? <img src={banner_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="text-4xl">🎟</span>
            </div>
          )
        }
        {status && status !== 'published' && (
          <div className="absolute top-3 left-3"><Badge status={status} /></div>
        )}
        {community_tag && (
          <div className="absolute top-3 right-3 bg-black/60 text-xs text-slate-300 px-2 py-0.5 rounded-full">{community_tag}</div>
        )}
        {priceLabel && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {priceLabel}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading font-bold text-slate-100 text-lg leading-tight line-clamp-2 mb-2">{title}</h3>
        <div className="flex items-center gap-1.5 text-muted text-xs mb-1">
          <Calendar size={12} />
          <span>{format(new Date(event_date), 'EEE, MMM d · h:mm a')}</span>
        </div>
        {(location || city) && (
          <div className="flex items-center gap-1.5 text-muted text-xs truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{[location, city].filter(Boolean).join(' · ')}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
