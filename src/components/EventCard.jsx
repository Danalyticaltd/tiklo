import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import Badge from './ui/Badge'

export default function EventCard({ event }) {
  const { id, title, event_date, location, city, community_tag, banner_url, status } = event

  return (
    <Link to={`/events/${id}`} className="block bg-surface rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary transition group">
      <div className="relative h-44 bg-slate-800">
        {banner_url
          ? <img src={banner_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">No image</div>
        }
        {status && status !== 'published' && (
          <div className="absolute top-3 left-3"><Badge status={status} /></div>
        )}
        {community_tag && (
          <div className="absolute top-3 right-3 bg-black/60 text-xs text-slate-300 px-2 py-0.5 rounded-full">{community_tag}</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading font-bold text-slate-100 text-lg leading-tight line-clamp-2">{title}</h3>
        <p className="text-muted text-sm mt-1">{format(new Date(event_date), 'EEE, MMM d · h:mm a')}</p>
        <p className="text-muted text-sm truncate">{[location, city].filter(Boolean).join(' · ')}</p>
      </div>
    </Link>
  )
}
