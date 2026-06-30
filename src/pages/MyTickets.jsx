import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MyTickets() {
  const { t } = useTranslation()
  const lp = useLangPath()
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
      const { data: orders } = await supabase
        .from('orders')
        .select('*, events(title, event_date, location), ticket_types(name)')
        .eq('buyer_email', email.toLowerCase().trim())
        .eq('status', 'paid')
        .ilike('id', `${orderId.trim().toLowerCase()}%`)
        .limit(1)

      if (!orders?.length) {
        setError(t('myTickets.notFound'))
        setLoading(false)
        return
      }

      const ord = orders[0]
      setOrder(ord)

      const { data: tix } = await supabase.from('tickets').select('*').eq('order_id', ord.id)
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
        <Link to={lp('/')} className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-6">
          {t('myTickets.back')}
        </Link>
        <h1 className="font-heading text-3xl font-bold text-navy mb-2">{t('myTickets.title')}</h1>
        <p className="text-muted text-sm mb-8">{t('myTickets.subtitle')}</p>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="block text-sm text-muted mb-1">{t('myTickets.emailLabel')}</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">
                {t('myTickets.orderIdLabel')} <span className="text-xs text-muted">{t('myTickets.orderIdHint')}</span>
              </label>
              <input
                type="text" required value={orderId} onChange={e => setOrderId(e.target.value)}
                placeholder={t('myTickets.orderIdPlaceholder')}
                maxLength={8}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition font-mono uppercase"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? t('myTickets.searching') : t('myTickets.submit')}
            </button>
          </form>
        </div>

        {tickets !== null && order && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl p-4 border border-[#E3E8EE]">
              <p className="text-xs text-muted mb-1">{t('myTickets.event')}</p>
              <p className="font-bold text-navy">{order.events?.title}</p>
              <p className="text-sm text-muted mt-0.5">
                {order.events?.event_date && new Date(order.events.event_date).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                {order.events?.location ? ` · ${order.events.location}` : ''}
              </p>
            </div>

            {tickets.length === 0 ? (
              <p className="text-center text-muted py-8">{t('myTickets.stillGenerating')}</p>
            ) : (
              tickets.map((tk, i) => (
                <div key={tk.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                  <p className="text-xs text-muted mb-0.5">{t('myTickets.ticketOf', { i: i + 1, total: tickets.length })}</p>
                  <p className="font-bold text-navy text-lg">{tk.buyer_name}</p>
                  <p className="text-sm text-muted mb-1">{order.ticket_types?.name}</p>
                  <p className="font-mono text-xs text-primary mb-4">{tk.id.slice(0, 8).toUpperCase()}</p>
                  {qrCodes[tk.id] && <img src={qrCodes[tk.id]} alt="QR Code" className="mx-auto w-48 h-48" />}
                  <p className="text-xs text-muted mt-3">{t('myTickets.scanAtDoor')}</p>
                </div>
              ))
            )}

            <p className="text-center text-xs text-muted">
              {t('myTickets.needHelp')} <a href="mailto:hello@tiklo.ca" className="text-primary hover:underline">hello@tiklo.ca</a>
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
