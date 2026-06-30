import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Plus, QrCode, BarChart2, RefreshCw, Pencil, Trash2, Send, UserCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLangPath } from '../../hooks/useLangPath'
import Navbar from '../../components/Navbar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const lp = useLangPath()
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
    if (!user) return
    fetchEvents().then(() => setLoading(false))

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `organizer_id=eq.${user.id}` }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_types' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchEvents)
      .subscribe()

    return () => supabase.removeChannel(channel)
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
    const { error } = await supabase.from('events').update({ status: 'pending' }).eq('id', event.id)
    if (error) { alert('Could not submit: ' + error.message); return }
    await fetchEvents()
  }

  async function unpublish(event) {
    const { error } = await supabase.from('events').update({ status: 'draft' }).eq('id', event.id)
    if (error) { alert('Could not unpublish: ' + error.message); return }
    await fetchEvents()
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
            <h1 className="font-heading text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-muted text-sm mt-1">{t('dashboard.welcome', { name: profile?.full_name ?? 'Organizer' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Refresh stats" className="p-2 rounded-lg text-muted hover:text-gray-900 hover:bg-gray-100 transition">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link to={lp('/dashboard/events/new')}>
              <Button><Plus size={16} className="inline mr-1.5" />{t('dashboard.newEvent')}</Button>
            </Link>
          </div>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">{t('dashboard.deleteTitle')}</h3>
              <p className="text-muted text-sm mb-2">
                <span className="font-semibold text-gray-800">{confirmDelete.title}</span> {t('dashboard.deleteConfirm', { title: '' }).trim()}
              </p>
              {totalSold(confirmDelete) > 0 && (
                <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  {t('dashboard.deleteWarning', { count: totalSold(confirmDelete) })}
                </p>
              )}
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('dashboard.cancel')}</Button>
                <button onClick={() => handleDelete(confirmDelete)} disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60">
                  {deleting ? t('dashboard.deleting') : t('dashboard.delete')}
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
            <p className="text-muted text-lg">{t('dashboard.noEvents')}</p>
            <Link to={lp('/dashboard/events/new')} className="inline-block mt-4">
              <Button><Plus size={16} className="inline mr-1.5" />{t('dashboard.createFirst')}</Button>
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
                  <p><span className="text-gray-900 font-semibold">{totalSold(event)}</span> {t('dashboard.sold')}</p>
                  <p><span className="text-green-600 font-semibold">{totalCheckedIn(event)}</span> {t('dashboard.checkedIn')}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {event.status === 'draft' && (
                    <button
                      onClick={() => submitForApproval(event)}
                      disabled={!profile?.approved}
                      className="text-xs px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium flex items-center gap-1"
                    >
                      <Send size={11} /> {t('dashboard.submit')}
                    </button>
                  )}
                  {event.status === 'pending' && (
                    <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-600 bg-amber-50 font-medium">
                      {t('dashboard.underReview')}
                    </span>
                  )}
                  {event.status === 'published' && (
                    <button
                      onClick={() => unpublish(event)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-muted hover:border-red-400 hover:text-red-500 transition font-medium"
                    >
                      {t('dashboard.unpublish')}
                    </button>
                  )}

                  <Link to={lp(`/dashboard/events/${event.id}/edit`)} title="Edit event">
                    <Button variant="secondary" size="sm"><Pencil size={14} /></Button>
                  </Link>
                  <Link to={lp(`/checkin/${event.id}`)} title="Check-in scanner">
                    <Button variant="secondary" size="sm"><QrCode size={14} /></Button>
                  </Link>
                  <Link to={lp(`/dashboard/events/${event.id}`)} title="View stats">
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
