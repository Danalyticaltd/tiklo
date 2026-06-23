import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, ExternalLink, EyeOff, XCircle, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'

const STATUS_STYLES = {
  published:  'bg-green-50 text-green-700 border-green-200',
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  draft:      'bg-gray-100 text-gray-500 border-gray-200',
  cancelled:  'bg-red-50 text-red-500 border-red-200',
}

export default function AdminEvents() {
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('published')
  const [confirmDelete, setConfirmDelete] = useState(null) // event object
  const [acting, setActing]       = useState(null) // eventId being acted on

  async function load() {
    const { data } = await supabase
      .from('events')
      .select('*, profiles!organizer_id(full_name, email), ticket_types(quantity_sold)')
      .order('created_at', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function callAction(eventId, action) {
    setActing(eventId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin-event-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ eventId, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      if (action === 'delete') {
        setEvents(prev => prev.filter(e => e.id !== eventId))
      } else {
        const nextStatus = action === 'unpublish' ? 'draft' : 'cancelled'
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: nextStatus } : e))
      }
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActing(null)
      setConfirmDelete(null)
    }
  }

  const filtered = events.filter(e => filter === 'all' ? true : e.status === filter)
  const counts = {
    published: events.filter(e => e.status === 'published').length,
    pending:   events.filter(e => e.status === 'pending').length,
    draft:     events.filter(e => e.status === 'draft').length,
    cancelled: events.filter(e => e.status === 'cancelled').length,
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Delete event?</h3>
            <p className="text-muted text-sm mb-1">
              <span className="font-semibold text-gray-800">{confirmDelete.title}</span> will be permanently deleted.
            </p>
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              This will also delete all orders and tickets for this event. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-muted hover:text-gray-900 transition">
                Cancel
              </button>
              <button
                onClick={() => callAction(confirmDelete.id, 'delete')}
                disabled={acting === confirmDelete.id}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60"
              >
                {acting === confirmDelete.id ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 mb-6 transition">
          <ArrowLeft size={14} /> Admin dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">All events</h1>
            <p className="text-muted text-sm mt-0.5">{events.length} total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'published', label: `Live (${counts.published})` },
              { key: 'pending',   label: `Pending (${counts.pending})` },
              { key: 'draft',     label: `Draft (${counts.draft})` },
              { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
              { key: 'all',       label: 'All' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium
                  ${filter === f.key ? 'bg-primary border-primary text-white' : 'border-gray-200 text-muted hover:text-gray-900'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">No events in this category.</div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 border border-gray-100 shadow-sm">
            {filtered.map(ev => {
              const sold = (ev.ticket_types ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
              const busy = acting === ev.id
              return (
                <div key={ev.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[ev.status] ?? STATUS_STYLES.draft}`}>
                        {ev.status}
                      </span>
                    </div>
                    <p className="text-muted text-xs">
                      {format(new Date(ev.event_date), 'EEE, MMM d, yyyy')} · {ev.city}
                    </p>
                    <p className="text-muted text-xs">
                      By {ev.profiles?.full_name ?? 'Unknown'} · {sold} ticket{sold !== 1 ? 's' : ''} sold
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/events/${ev.id}`} target="_blank"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-primary hover:border-primary transition"
                      title="Preview event">
                      <ExternalLink size={14} />
                    </Link>

                    {ev.status === 'published' && (
                      <button
                        onClick={() => callAction(ev.id, 'unpublish')}
                        disabled={busy}
                        title="Unpublish — moves back to draft"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600 transition disabled:opacity-40"
                      >
                        <EyeOff size={13} /> {busy ? '…' : 'Unpublish'}
                      </button>
                    )}

                    {(ev.status === 'published' || ev.status === 'pending') && (
                      <button
                        onClick={() => callAction(ev.id, 'cancel')}
                        disabled={busy}
                        title="Cancel event — shows cancelled banner to buyers"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-500 transition disabled:opacity-40"
                      >
                        <XCircle size={13} /> {busy ? '…' : 'Cancel'}
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmDelete(ev)}
                      disabled={busy}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
