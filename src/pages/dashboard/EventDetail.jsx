import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Download, FileSpreadsheet, Pencil, Trash2, ExternalLink, QrCode } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [qrGenerating, setQrGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refundingId, setRefundingId] = useState(null)
  const [confirmRefundId, setConfirmRefundId] = useState(null)
  const [orderOffset, setOrderOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE = 50

  async function fetchOrders(offset = 0) {
    let { data: { session } } = await supabase.auth.getSession()
    // Supabase restores the session asynchronously on first load — retry once if null
    if (!session?.access_token) {
      await new Promise(r => setTimeout(r, 400))
      const retry = await supabase.auth.getSession()
      session = retry.data.session
    }
    const token = session?.access_token
    if (!token) return { orders: [], count: 0 }
    const res = await fetch(`/api/event-orders?event_id=${id}&limit=${PAGE}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { console.error('[EventDetail] event-orders error', res.status); return { orders: [], count: 0 } }
    return res.json()
  }

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: tt }, ordResult] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('ticket_types').select('*').eq('event_id', id),
        fetchOrders(0),
      ])
      setEvent(ev)
      setTicketTypes(tt ?? [])
      setOrders(ordResult.orders ?? [])
      setOrderOffset(PAGE)
      setHasMore((ordResult.count ?? 0) > PAGE)
      setLoading(false)
    }
    load()
  }, [id, user])

  async function loadMoreOrders() {
    setLoadingMore(true)
    const { orders: more, count } = await fetchOrders(orderOffset)
    if (more?.length) {
      setOrders(prev => [...prev, ...more])
      setOrderOffset(o => o + PAGE)
      setHasMore(orderOffset + more.length < count)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  function exportCsv() {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Buyer Name', 'Buyer Email', 'Ticket Type', 'Quantity', 'Subtotal (CAD)', 'Status', 'Date'],
      ...orders.filter(o => o.status === 'paid').map(o => [
        esc(o.buyer_name),
        esc(o.buyer_email),
        esc(o.ticket_types?.name),
        o.quantity,
        Number(o.subtotal).toFixed(2),
        o.status,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    triggerDownload(csv, `${event?.title ?? 'event'}-attendees.csv`)
  }

  function exportSettlement() {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const paid = orders.filter(o => o.status === 'paid')

    const dataRows = paid.map(o => {
      const subtotal    = Number(o.subtotal ?? 0)
      const serviceFee  = Number(o.platform_fee ?? 0)        // combined buyer service fee (4.4% + $1.09)
      const buyerTotal  = subtotal + serviceFee
      const stripeFee   = Math.round((buyerTotal * 0.029 + 0.30) * 100) / 100  // estimated
      const tikloNet    = Math.round((serviceFee - stripeFee) * 100) / 100
      const orgPayout   = subtotal                            // organiser always gets full face value
      return [
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
        esc(o.buyer_name),
        esc(o.buyer_email),
        esc(o.ticket_types?.name),
        o.quantity,
        (subtotal / o.quantity).toFixed(2),
        subtotal.toFixed(2),
        serviceFee.toFixed(2),
        stripeFee.toFixed(2),
        tikloNet.toFixed(2),
        orgPayout.toFixed(2),
        buyerTotal.toFixed(2),
      ]
    })

    // Summary totals row
    const sum = (key, fn) => paid.reduce((s, o) => s + fn(o), 0)
    const totSubtotal   = sum('', o => Number(o.subtotal ?? 0))
    const totService    = sum('', o => Number(o.platform_fee ?? 0))
    const totBuyer      = totSubtotal + totService
    const totStripe     = Math.round((totBuyer * 0.029 + 0.30 * paid.length) * 100) / 100
    const totTiklo      = Math.round((totService - totStripe) * 100) / 100
    const totOrg        = totSubtotal

    const header = ['Date', 'Buyer Name', 'Buyer Email', 'Ticket Type', 'Qty',
      'Unit Price (CAD)', 'Ticket Revenue (CAD)', 'Service Fee – Buyer (CAD)',
      'Stripe Fee est. (CAD)', 'Tiklo Net (CAD)', 'Organiser Payout (CAD)', 'Total Charged (CAD)']
    const totals = ['TOTAL', '', '', '', paid.reduce((s,o)=>s+o.quantity,0),
      '', totSubtotal.toFixed(2), totService.toFixed(2),
      totStripe.toFixed(2), totTiklo.toFixed(2), totOrg.toFixed(2), totBuyer.toFixed(2)]

    const rows = [header, ...dataRows, [], totals]
    const csv = rows.map(r => r.join(',')).join('\n')
    const slug = (event?.title ?? 'event').replace(/\s+/g, '-').toLowerCase()
    triggerDownload(csv, `${slug}-settlement.csv`)
  }

  async function downloadQrPoster() {
    setQrGenerating(true)
    try {
      const eventUrl = `${window.location.origin}/events/${id}`
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(eventUrl)}&margin=2`

      const qrImg = await new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = qrSrc
      })

      const W = 600, H = 920
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')

      // Purple background
      ctx.fillStyle = '#635BFF'
      ctx.fillRect(0, 0, W, H)

      // White card
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(36, 90, W - 72, H - 150, 20)
      ctx.fill()

      // Wordmark
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 38px system-ui, sans-serif'
      ctx.fillText('Tiklo', W / 2, 58)

      // Event title (wrap at ~38 chars)
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 26px system-ui, sans-serif'
      const words = (event.title ?? '').split(' ')
      let line = '', y = 160
      for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (ctx.measureText(test).width > W - 100) {
          ctx.fillText(line, W / 2, y); y += 36; line = word
        } else { line = test }
      }
      if (line) { ctx.fillText(line, W / 2, y); y += 36 }

      // Date
      ctx.fillStyle = '#6b7280'
      ctx.font = '17px system-ui, sans-serif'
      ctx.fillText(format(new Date(event.event_date), 'EEE, MMM d, yyyy · h:mm a'), W / 2, y + 16)

      // Location
      if (event.location) {
        ctx.fillText(`📍 ${event.location}`, W / 2, y + 44)
      }

      // QR code
      const qrSize = 280, qrX = (W - qrSize) / 2, qrY = 340
      ctx.fillStyle = '#f3f4f6'
      ctx.beginPath(); ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 12); ctx.fill()
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

      // CTA
      ctx.fillStyle = '#635BFF'
      ctx.font = 'bold 22px system-ui, sans-serif'
      ctx.fillText('Scan to buy tickets', W / 2, qrY + qrSize + 56)

      ctx.fillStyle = '#9ca3af'
      ctx.font = '15px system-ui, sans-serif'
      ctx.fillText('tiklo.ca', W / 2, H - 28)

      const slug = (event.title ?? 'event').replace(/\s+/g, '-').toLowerCase()
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${slug}-door-qr.png`
      a.click()
    } catch (err) {
      alert('Could not generate QR poster: ' + err.message)
    } finally {
      setQrGenerating(false)
    }
  }

  function triggerDownload(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleRefund(orderId) {
    setConfirmRefundId(null)
    setRefundingId(orderId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orderId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Refund failed')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refund_requested' } : o))
    } catch (err) {
      alert('Refund failed: ' + err.message)
    } finally {
      setRefundingId(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('tickets').delete().eq('event_id', id),
        supabase.from('orders').delete().eq('event_id', id),
        supabase.from('ticket_types').delete().eq('event_id', id),
        supabase.from('events').delete().eq('id', id),
      ])
      const err = r1.error || r2.error || r3.error || r4.error
      if (err) throw new Error(err.message)
      navigate('/dashboard')
    } catch (err) {
      alert('Delete failed: ' + err.message)
      setDeleting(false)
    }
  }

  const paidOrders    = orders.filter(o => o.status === 'paid')
  const totalRevenue  = paidOrders.reduce((s, o) => s + Number(o.subtotal ?? 0), 0)
  const orgPayout     = totalRevenue  // organiser always receives full face value
  const totalSoldCount = ticketTypes.reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
  const totalSold = totalSoldCount

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

      {/* Refund confirmation modal */}
      {confirmRefundId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Request refund?</h3>
            <p className="text-muted text-sm mb-4">This will flag the order for refund and notify Tiklo admin to process it. The buyer will be contacted by the support team.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setConfirmRefundId(null)}>Cancel</Button>
              <button
                onClick={() => handleRefund(confirmRefundId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
              >
                Yes, request refund
              </button>
            </div>
          </div>
        </div>
      )}

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

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">{event?.title}</h1>
            <p className="text-muted text-sm mt-1">{event?.event_date && format(new Date(event.event_date), 'EEE, MMM d, yyyy · h:mm a')} · {event?.city}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link to={`/events/${id}`} target="_blank" rel="noopener noreferrer" title="View public event page" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition">
              <ExternalLink size={16} />
            </Link>
            <Link to={`/dashboard/events/${id}/edit`} title="Edit event" className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition font-medium">
              <Pencil size={14} />Edit
            </Link>
            <button onClick={downloadQrPoster} disabled={qrGenerating} title="Download door QR poster" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition disabled:opacity-50">
              <QrCode size={16} />
            </button>
            <button onClick={exportCsv} title="Export attendees CSV" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition">
              <Download size={16} />
            </button>
            <button onClick={exportSettlement} title="Export settlement report CSV" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition">
              <FileSpreadsheet size={16} />
            </button>
            <button onClick={() => setConfirmDelete(true)} title="Delete event" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500 transition">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Tickets sold</p>
            <p className="text-3xl font-bold text-gray-900">{totalSold}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Gross revenue</p>
            <p className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Your payout</p>
            <p className="text-3xl font-bold text-emerald-600">${orgPayout.toFixed(2)}</p>
            <p className="text-muted text-xs mt-1">Full face value</p>
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
                <Bar dataKey="sold" name="Sold" fill="#635BFF" radius={[4, 4, 0, 0]} />
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
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-gray-700">{o.ticket_types?.name} × {o.quantity}</p>
                      <p className="text-xs text-muted">{format(new Date(o.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                    {o.status === 'refunded' ? (
                      <span className="text-xs font-medium text-muted bg-gray-100 px-2 py-0.5 rounded-full">Refunded</span>
                    ) : o.status === 'refund_requested' ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Refund pending</span>
                    ) : (
                      <button
                        onClick={() => setConfirmRefundId(o.id)}
                        disabled={refundingId === o.id}
                        className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2 py-0.5 rounded-full transition disabled:opacity-40"
                      >
                        {refundingId === o.id ? '…' : 'Refund'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMore && (
            <div className="px-5 py-4 border-t border-gray-100 text-center">
              <button onClick={loadMoreOrders} disabled={loadingMore} className="text-sm text-primary font-medium hover:underline disabled:opacity-50">
                {loadingMore ? 'Loading…' : 'Load more orders'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
