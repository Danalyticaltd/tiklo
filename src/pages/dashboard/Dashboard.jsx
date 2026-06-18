import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, QrCode, BarChart2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, ticket_types(quantity, quantity_sold), tickets(checked_in)')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
    setEvents(data ?? [])
  }

  useEffect(() => {
    if (user) fetchEvents().then(() => setLoading(false))
  }, [user])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchEvents()
    setRefreshing(false)
  }

  function totalSold(event) {
    return (event.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
  }

  function totalCheckedIn(event) {
    return (event.tickets ?? []).filter(t => t.checked_in).length
  }

  async function toggleStatus(event) {
    const next = event.status === 'published' ? 'draft' : 'published'
    await supabase.from('events').update({ status: next }).eq('id', event.id)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: next } : e))
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-100">My Events</h1>
            <p className="text-muted text-sm mt-1">Welcome back, {profile?.full_name ?? 'Organizer'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Refresh stats" className="p-2 rounded-lg text-muted hover:text-slate-100 hover:bg-surface transition">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link to="/dashboard/events/new">
              <Button><Plus size={16} className="inline mr-1.5" />New event</Button>
            </Link>
          </div>
        </div>

        {/* Approval warning */}
        {profile && !profile.approved && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl px-4 py-3 text-sm mb-6">
            Your account is pending admin approval. You can create events but won't be able to publish until approved.
          </div>
        )}


        {/* Events table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-700 rounded-2xl">
            <p className="text-muted text-lg">No events yet.</p>
            <Link to="/dashboard/events/new" className="inline-block mt-4">
              <Button><Plus size={16} className="inline mr-1.5" />Create your first event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-surface rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge status={event.status} />
                    {event.community_tag && <span className="text-xs text-muted">{event.community_tag}</span>}
                  </div>
                  <p className="font-semibold text-slate-100 truncate">{event.title}</p>
                  <p className="text-muted text-xs mt-0.5">{format(new Date(event.event_date), 'EEE, MMM d, yyyy')} · {event.city}</p>
                </div>

                {/* Stats */}
                <div className="text-sm text-muted shrink-0 text-right">
                  <p><span className="text-slate-100 font-semibold">{totalSold(event)}</span> sold</p>
                  <p><span className="text-green-400 font-semibold">{totalCheckedIn(event)}</span> checked in</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(event)}
                    disabled={!profile?.approved && event.status === 'draft'}
                    title={event.status === 'published' ? 'Unpublish' : 'Publish'}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium
                      ${event.status === 'published'
                        ? 'border-slate-600 text-muted hover:border-red-500 hover:text-red-400'
                        : 'border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed'}`}
                  >
                    {event.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link to={`/checkin/${event.id}`} title="Check-in scanner">
                    <Button variant="secondary" size="sm"><QrCode size={14} /></Button>
                  </Link>
                  <Link to={`/dashboard/events/${event.id}`} title="View stats">
                    <Button variant="secondary" size="sm"><BarChart2 size={14} /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
