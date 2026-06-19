import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: tt }, { data: ord }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('ticket_types').select('*').eq('event_id', id),
        supabase.from('orders').select('*, ticket_types(name)').eq('event_id', id).eq('status', 'paid').order('created_at', { ascending: false }),
      ])
      setEvent(ev)
      setTicketTypes(tt ?? [])
      setOrders(ord ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  function exportCsv() {
    const rows = [
      ['Buyer Name', 'Buyer Email', 'Ticket Type', 'Quantity', 'Subtotal', 'Date'],
      ...orders.map(o => [
        o.buyer_name,
        o.buyer_email,
        o.ticket_types?.name,
        o.quantity,
        `$${Number(o.subtotal).toFixed(2)}`,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.title ?? 'event'}-attendees.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await supabase.from('tickets').delete().eq('event_id', id)
      await supabase.from('orders').delete().eq('event_id', id)
      await supabase.from('ticket_types').delete().eq('event_id', id)
      await supabase.from('events').delete().eq('id', id)
      navigate('/dashboard')
    } catch (err) {
      alert('Delete failed: ' + err.message)
      setDeleting(false)
    }
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.subtotal ?? 0), 0)
  const totalSold = orders.reduce((s, o) => s + (o.quantity ?? 0), 0)
  const totalSoldCount = ticketTypes.reduce((s, t) => s + (t.quantity_sold ?? 0), 0)

  const chartData = ticketTypes.map(tt => ({
    name: tt.name,
    sold: tt.quantity_sold ?? 0,
    remaining: (tt.quantity ?? 0) - (tt.quantity_sold ?? 0),
  }))

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Delete event?</h3>
            <p className="text-muted text-sm mb-2">
              <span className="font-semibold text-gray-800">{event?.title}</span> will be permanently deleted.
            </p>
            {totalSoldCount > 0 && (
              <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                Warning: {totalSoldCount} ticket{totalSoldCount !== 1 ? 's' : ''} have already been sold. Deleting will not automatically refund buyers.
              </p>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 mb-6">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">{event?.title}</h1>
            <p className="text-muted text-sm mt-1">{event?.event_date && format(new Date(event.event_date), 'EEE, MMM d, yyyy · h:mm a')} · {event?.city}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/dashboard/events/${id}/edit`}>
              <Button variant="secondary"><Pencil size={14} className="mr-1.5" />Edit</Button>
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-red-400 hover:text-red-500 transition font-medium"
            >
              <Trash2 size={14} />Delete
            </button>
            <Button variant="secondary" onClick={exportCsv}><Download size={14} className="mr-1.5" />Export CSV</Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Tickets sold</p>
            <p className="text-3xl font-bold text-gray-900">{totalSold}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Gross revenue</p>
            <p className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Orders</p>
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
          </div>
        </div>

        {/* Sales chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-8 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Tickets by type</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#6B6355', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B6355', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' }} />
                <Bar dataKey="sold" name="Sold" fill="#DC5E3D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name="Remaining" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attendee list */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Attendees</h2>
            <span className="text-muted text-sm">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          </div>
          {orders.length === 0 ? (
            <p className="text-center text-muted py-12">No orders yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map(o => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium truncate">{o.buyer_name}</p>
                    <p className="text-muted text-xs truncate">{o.buyer_email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-700">{o.ticket_types?.name} × {o.quantity}</p>
                    <p className="text-xs text-muted">{format(new Date(o.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
