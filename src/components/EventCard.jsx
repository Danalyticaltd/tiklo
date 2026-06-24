import { Link } from 'react-router-dom'
import { format, differenceInDays, isPast } from 'date-fns'
import { MapPin, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import Badge from './ui/Badge'

export default function EventCard({ event, featured = false }) {
  const { id, title, event_date, location, city, community_tag, event_type, banner_url, status, ticket_types, isHot } = event

  const totalCapacity = (ticket_types ?? []).reduce((s, t) => s + (t.quantity ?? 0), 0)
  const totalSold = (ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
  const isSoldOut = totalCapacity > 0 && totalSold >= totalCapacity

  const minPrice = ticket_types?.length
    ? Math.min(...ticket_types.map(t => Number(t.price ?? 0)))
    : null

  const priceLabel = isSoldOut ? null
    : minPrice === null ? null
    : minPrice === 0 ? 'Free'
    : `From $${minPrice.toFixed(2)}`

  const date = new Date(event_date)
  const daysLeft = differenceInDays(date, new Date())
  const isToday = daysLeft === 0 && !isPast(date)
  const isTomorrow = daysLeft === 1

  let urgencyLabel = null
  if (isToday) urgencyLabel = { text: 'Today!', cls: 'bg-primary text-white' }
  else if (isTomorrow) urgencyLabel = { text: 'Tomorrow', cls: 'bg-primary/10 text-primary' }
  else if (daysLeft <= 7 && daysLeft > 1) urgencyLabel = { text: `In ${daysLeft} days`, cls: 'bg-surface text-navy' }

  const categoryLabel = event_type || community_tag

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link
        to={`/events/${id}`}
        className="block bg-white rounded-2xl border border-[#E3E8EE] overflow-hidden hover:shadow-lg hover:shadow-navy/8 transition-all duration-300 group"
      >
        {/* Banner */}
        <div className="relative h-48 bg-gray-100">
          {banner_url
            ? <img src={banner_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
            : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-white to-cyan/10">
                <span className="text-5xl">🎟</span>
              </div>
            )
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {isSoldOut && (
            <>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow tracking-wide">
                🚫 Sold Out
              </div>
            </>
          )}
          {isHot && !isSoldOut && (
            <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
              🔥 Hot
            </div>
          )}
          {status && status !== 'published' && !isHot && !isSoldOut && (
            <div className="absolute top-3 left-3"><Badge status={status} /></div>
          )}

          {/* Category badge */}
          {categoryLabel && (
            <div className="absolute top-3 right-3 bg-black/35 backdrop-blur-sm text-xs font-semibold text-white px-2.5 py-1 rounded-full border border-white/15">
              {categoryLabel}
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {priceLabel && (
              <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                {priceLabel}
              </div>
            )}
            {urgencyLabel && (
              <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyLabel.cls}`}>
                {urgencyLabel.text}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <h3 className="font-heading font-bold text-navy text-lg leading-tight line-clamp-2 mb-2.5">{title}</h3>
          <div className="flex items-center gap-1.5 text-muted text-xs mb-1.5">
            <Calendar size={12} className="text-primary shrink-0" />
            <span>{format(date, 'EEE, MMM d · h:mm a')}</span>
          </div>
          {(location || city) && (
            <div className="flex items-center gap-1.5 text-muted text-xs truncate">
              <MapPin size={12} className="text-cyan shrink-0" />
              <span className="truncate">{[location, city].filter(Boolean).join(' · ')}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
