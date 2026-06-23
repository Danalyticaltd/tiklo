import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MyTickets() {
  const [email, setEmail] = useState('')
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [order, setOrder] = useState(null)
  const [qrCodes, setQrCodes] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setTickets(null)
    setLoading(true)
    try {
      // Find order by email + order ID prefix (first 8 chars)
      const { data: orders } = await supabase
        .from('orders')
        .select('*, events(title, event_date, location), ticket_types(name)')
        .eq('buyer_email', email.toLowerCase().trim())
        .eq('status', 'paid')
        .ilike('id', `${orderId.trim().toLowerCase()}%`)
        .limit(1)

      if (!orders?.length) {
        setError('No ticket found with that email and order ID. Check your confirmation email and try again.')
        setLoading(false)
        return
      }

      const ord = orders[0]
      setOrder(ord)

      const { data: tix } = await supabase
        .from('tickets')
        .select('*')
        .eq('order_id', ord.id)

      setTickets(tix ?? [])

      const codes = {}
      for (const t of tix ?? []) {
        codes[t.id] = await QRCode.toDataURL(t.qr_code, { width: 200, margin: 1 })
      }
      setQrCodes(codes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-6">
          ← Back to events
        </Link>
        <h1 className="font-heading text-3xl font-bold text-navy mb-2">Find my tickets</h1>
        <p className="text-muted text-sm mb-8">Enter your email and the order ID from your confirmation email.</p>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="block text-sm text-muted mb-1">Email used at checkout</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Order ID <span className="text-xs text-muted">(first 8 characters from your email)</span></label>
              <input
                type="text" required value={orderId} onChange={e => setOrderId(e.target.value)}
                placeholder="e.g. 334EB999"
                maxLength={8}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition font-mono uppercase"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Find my tickets'}
            </button>
          </form>
        </div>

        {tickets !== null && order && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl p-4 border border-[#E3E8EE]">
              <p className="text-xs text-muted mb-1">Event</p>
              <p className="font-bold text-navy">{order.events?.title}</p>
              <p className="text-sm text-muted mt-0.5">
                {order.events?.event_date && new Date(order.events.event_date).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                {order.events?.location ? ` · ${order.events.location}` : ''}
              </p>
            </div>

            {tickets.length === 0 ? (
              <p className="text-center text-muted py-8">Tickets are still being generated. Check back in a minute.</p>
            ) : (
              tickets.map((t, i) => (
                <div key={t.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                  <p className="text-xs text-muted mb-0.5">Ticket {i + 1} of {tickets.length}</p>
                  <p className="font-bold text-navy text-lg">{t.buyer_name}</p>
                  <p className="text-sm text-muted mb-1">{order.ticket_types?.name}</p>
                  <p className="font-mono text-xs text-primary mb-4">{t.id.slice(0, 8).toUpperCase()}</p>
                  {qrCodes[t.id] && <img src={qrCodes[t.id]} alt="QR Code" className="mx-auto w-48 h-48" />}
                  <p className="text-xs text-muted mt-3">Scan at the door — single use</p>
                </div>
              ))
            )}

            <p className="text-center text-xs text-muted">
              Need help? <a href="mailto:hello@tiklo.ca" className="text-primary hover:underline">hello@tiklo.ca</a>
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
