import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, Download } from 'lucide-react'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'

export default function TicketConfirm() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  const [tickets, setTickets] = useState([])
  const [order, setOrder] = useState(null)
  const [qrCodes, setQrCodes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!orderId) return
      const { data: ord } = await supabase
        .from('orders')
        .select('*, events(title, event_date, location), ticket_types(name)')
        .eq('id', orderId)
        .single()
      setOrder(ord)

      const { data: tix } = await supabase
        .from('tickets')
        .select('*')
        .eq('order_id', orderId)
      setTickets(tix ?? [])

      // Generate QR data URLs
      const codes = {}
      for (const t of tix ?? []) {
        codes[t.id] = await QRCode.toDataURL(t.qr_code, { width: 220, margin: 1, color: { dark: '#000', light: '#fff' } })
      }
      setQrCodes(codes)
      setLoading(false)
    }
    load()
  }, [orderId])

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-surface rounded-full animate-pulse mx-auto mb-4" />
        <div className="h-6 bg-surface rounded w-1/2 mx-auto animate-pulse" />
      </div>
    </div>
  )

  const event = order?.events
  const ticketTypeName = order?.ticket_types?.name

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success banner */}
        <div className="text-center mb-8">
          <CheckCircle size={52} className="text-green-400 mx-auto mb-3" />
          <h1 className="font-heading text-3xl font-bold text-slate-100">You're in!</h1>
          <p className="text-muted mt-1">Your tickets have been sent to <span className="text-slate-100">{order?.buyer_email}</span></p>
        </div>

        {/* Event info */}
        {event && (
          <div className="bg-surface rounded-2xl p-5 mb-6">
            <h2 className="font-heading font-bold text-slate-100 text-lg">{event.title}</h2>
            <p className="text-muted text-sm mt-1">{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy · h:mm a')}</p>
            {event.location && <p className="text-muted text-sm">{event.location}</p>}
          </div>
        )}

        {/* QR tickets */}
        <div className="space-y-4">
          {tickets.map((ticket, i) => (
            <div key={ticket.id} className="bg-surface rounded-2xl p-6 text-center">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">
                {ticketTypeName} — Ticket {tickets.length > 1 ? `${i + 1} of ${tickets.length}` : ''}
              </p>
              <p className="font-semibold text-slate-100 mb-4">{order?.buyer_name}</p>
              {qrCodes[ticket.id] && (
                <div className="bg-white rounded-xl p-3 inline-block mb-4">
                  <img src={qrCodes[ticket.id]} alt="QR Code" width={200} height={200} />
                </div>
              )}
              <p className="text-muted text-xs font-mono">{ticket.id.slice(0, 8).toUpperCase()}</p>
              {ticket.checked_in && (
                <p className="text-green-400 text-xs mt-2 font-medium">✓ Checked in</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="secondary">Browse more events</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
