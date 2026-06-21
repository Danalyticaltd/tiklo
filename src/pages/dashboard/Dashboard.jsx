import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, QrCode, BarChart2, RefreshCw, Pencil, Trash2, Send, UserCircle } from 'lucide-react'
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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  // Re-fetch when user returns to this tab so status changes made by admin are reflected
  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible' && user) fetchEvents() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
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

  async function submitForApproval(event) {
    await supabase.from('events').update({ status: 'pending' }).eq('id', event.id)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'pending' } : e))
  }

  async function unpublish(event) {
    await supabase.from('events').update({ status: 'draft' }).eq('id', event.id)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'draft' } : e))
  }

  async function handleDelete(event) {
    setDeleting(true)
    try {
      const { error: e1 } = await supabase.from('tickets').delete().eq('event_id', event.id)
      if (e1) throw new Error('Could not delete tickets: ' + e1.message)
      const { error: e2 } = await supabase.from('orders').delete().eq('event_id', event.id)
      if (e2) throw new Error('Could not delete orders: ' + e2.message)
      const { error: e3 } = await supabase.from('ticket_types').delete().eq('event_id', event.id)
      if (e3) throw new Error('Could not delete ticket types: ' + e3.message)
      const { error: e4 } = await supabase.from('events').delete().eq('id', event.id)
      if (e4) throw new Error('Could not delete event: ' + e4.message)

      // Re-fetch to confirm deletion was persisted
      await fetchEvents()
      setConfirmDelete(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">My Events</h1>
            <p className="text-muted text-sm mt-1">Welcome back, {profile?.full_name ?? 'Organizer'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Refresh stats" className="p-2 rounded-lg text-muted hover:text-gray-900 hover:bg-gray-100 transition">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link to="/dashboard/connect" className="text-xs text-muted hover:text-gray-900 transition font-medium hidden sm:block">Payment info</Link>
            <Link to="/dashboard/profile" title="My profile">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200 hover:border-primary transition" />
                : <button className="p-2 rounded-lg text-muted hover:text-gray-900 hover:bg-gray-100 transition"><UserCircle size={20} /></button>
              }
            </Link>
            <Link to="/dashboard/events/new">
              <Button><Plus size={16} className="inline mr-1.5" />New event</Button>
            </Link>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Delete event?</h3>
              <p className="text-muted text-sm mb-2">
                <span className="font-semibold text-gray-800">{confirmDelete.title}</span> will be permanently deleted.
              </p>
              {totalSold(confirmDelete) > 0 && (
                <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  Warning: {totalSold(confirmDelete)} ticket{totalSold(confirmDelete) !== 1 ? 's' : ''} have already been sold. Deleting will not automatically refund buyers.
                </p>
              )}
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <button onClick={() => handleDelete(confirmDelete)} disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-muted text-lg">No events yet.</p>
            <Link to="/dashboard/events/new" className="inline-block mt-4">
              <Button><Plus size={16} className="inline mr-1.5" />Create your first event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge status={event.status} />
                    {event.community_tag && <span className="text-xs text-muted">{event.community_tag}</span>}
                  </div>
                  <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                  <p className="text-muted text-xs mt-0.5">{format(new Date(event.event_date), 'EEE, MMM d, yyyy')} · {event.city}</p>
                </div>

                <div className="text-sm text-muted shrink-0 text-right">
                  <p><span className="text-gray-900 font-semibold">{totalSold(event)}</span> sold</p>
                  <p><span className="text-green-600 font-semibold">{totalCheckedIn(event)}</span> checked in</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status action button */}
                  {event.status === 'draft' && (
                    <button
                      onClick={() => submitForApproval(event)}
                      disabled={!profile?.approved}
                      title="Submit for approval"
                      className="text-xs px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium flex items-center gap-1"
                    >
                      <Send size={11} /> Submit
                    </button>
                  )}
                  {event.status === 'pending' && (
                    <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-600 bg-amber-50 font-medium">
                      Under review
                    </span>
                  )}
                  {event.status === 'published' && (
                    <button
                      onClick={() => unpublish(event)}
                      title="Unpublish"
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-muted hover:border-red-400 hover:text-red-500 transition font-medium"
                    >
                      Unpublish
                    </button>
                  )}

                  <Link to={`/dashboard/events/${event.id}/edit`} title="Edit event">
                    <Button variant="secondary" size="sm"><Pencil size={14} /></Button>
                  </Link>
                  <Link to={`/checkin/${event.id}`} title="Check-in scanner">
                    <Button variant="secondary" size="sm"><QrCode size={14} /></Button>
                  </Link>
                  <Link to={`/dashboard/events/${event.id}`} title="View stats">
                    <Button variant="secondary" size="sm"><BarChart2 size={14} /></Button>
                  </Link>
                  <button onClick={() => setConfirmDelete(event)} title="Delete event"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
