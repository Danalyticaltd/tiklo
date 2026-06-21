import Footer from '../components/Footer'
﻿import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'

export default function TicketConfirm() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  const emailFromUrl = searchParams.get('email')
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
        <div className="w-16 h-16 bg-gray-100 rounded-full animate-pulse mx-auto mb-4" />
        <div className="h-6 bg-gray-100 rounded w-1/2 mx-auto animate-pulse" />
      </div>
    </div>
  )

  const event = order?.events
  const ticketTypeName = order?.ticket_types?.name
  const qty = order?.quantity ?? tickets.length

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Success banner */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">You're officially in!</h1>
          <p className="text-muted mt-1">Your booking is confirmed — see you there.</p>
          <p className="text-sm text-gray-500 mt-2">
            {qty} ticket{qty !== 1 ? 's' : ''} sent to{' '}
            <span className="font-semibold text-gray-900">
              {emailFromUrl || order?.buyer_email || '—'}
            </span>
          </p>
        </motion.div>

        {/* Event info */}
        {event && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-5 mb-6 border border-primary/10"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎟</span>
              <div>
                <h2 className="font-heading font-bold text-gray-900 text-lg">{event.title}</h2>
                <p className="text-muted text-sm mt-1">{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy · h:mm a')}</p>
                {event.location && <p className="text-muted text-sm">📍 {event.location}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* QR tickets */}
        <div className="space-y-4">
          {tickets.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm"
            >
              <p className="text-muted text-xs uppercase tracking-wider mb-1">
                {ticketTypeName}{tickets.length > 1 ? ` — Ticket ${i + 1} of ${tickets.length}` : ''}
              </p>
              <p className="font-semibold text-gray-900 mb-4">{order?.buyer_name}</p>
              {qrCodes[ticket.id] && (
                <div className="bg-white rounded-xl p-3 inline-block mb-4 border border-gray-100">
                  <img src={qrCodes[ticket.id]} alt="QR Code" width={200} height={200} />
                </div>
              )}
              <p className="text-muted text-xs font-mono">{ticket.id.slice(0, 8).toUpperCase()}</p>
              {ticket.checked_in && (
                <p className="text-green-600 text-xs mt-2 font-medium">✓ Checked in</p>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-3"
        >
          <p className="text-gray-400 text-xs">PDF ticket attached to your confirmation email — show QR at the door.</p>
          <Link to="/">
            <Button variant="secondary">Browse more events</Button>
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
