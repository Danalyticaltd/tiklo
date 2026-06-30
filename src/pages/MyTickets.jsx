import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MyTickets() {
  const { t } = useTranslation()
  const lp = useLangPath()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // Email form state
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState(null)

  // Token verification + ticket display state
  const [verifying, setVerifying] = useState(!!token)
  const [tokenError, setTokenError] = useState(null)
  const [groups, setGroups] = useState(null)

  useEffect(() => {
    if (!token) return
    async function verify() {
      setVerifying(true)
      try {
        const res = await fetch('/api/verify-ticket-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (!res.ok) { setTokenError(data.error); setVerifying(false); return }

        // Fetch tickets for the verified email
        const { data: orders } = await supabase
          .from('orders')
          .select('*, events(id, title, event_date, location)')
          .eq('buyer_email', data.email)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })

        const result = []
        for (const ord of orders ?? []) {
          const { data: tix } = await supabase
            .from('tickets')
            .select('*, ticket_types(name)')
            .eq('order_id', ord.id)
          const codes = {}
          for (const tk of tix ?? []) {
            codes[tk.id] = await QRCode.toDataURL(tk.qr_code, { width: 200, margin: 1 })
          }
          result.push({ order: ord, tickets: tix ?? [], qrCodes: codes })
        }
        setGroups(result)
      } catch (err) {
        setTokenError(err.message)
      } finally {
        setVerifying(false)
      }
    }
    verify()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSending(true)
    try {
      const res = await fetch('/api/send-ticket-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error); return }
      setSent(true)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSending(false)
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

        {/* Token flow */}
        {token ? (
          verifying ? (
            <p className="text-muted text-sm mt-6 animate-pulse">{t('myTickets.verifying')}</p>
          ) : tokenError ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mt-6 text-center space-y-3">
              <p className="text-red-500 text-sm">{tokenError}</p>
              <Link to={lp('/my-tickets')} className="text-primary text-sm hover:underline block">
                {t('myTickets.requestNew')}
              </Link>
            </div>
          ) : groups !== null && (
            <div className="space-y-10 mt-6">
              {groups.map(({ order, tickets, qrCodes }) => (
                <div key={order.id}>
                  <div className="bg-surface rounded-xl px-4 py-3 border border-[#E3E8EE] mb-4">
                    <p className="font-bold text-navy">{order.events?.title}</p>
                    <p className="text-sm text-muted mt-0.5">
                      {order.events?.event_date && new Date(order.events.event_date).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                      {order.events?.location ? ` · ${order.events.location}` : ''}
                    </p>
                  </div>
                  {tickets.length === 0 ? (
                    <p className="text-center text-muted py-4 text-sm">{t('myTickets.stillGenerating')}</p>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((tk, i) => (
                        <div key={tk.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                          <p className="text-xs text-muted mb-0.5">{t('myTickets.ticketOf', { i: i + 1, total: tickets.length })}</p>
                          <p className="font-bold text-navy text-lg">{tk.buyer_name}</p>
                          <p className="text-sm text-muted mb-1">{tk.ticket_types?.name}</p>
                          <p className="font-mono text-xs text-primary mb-4">{tk.id.slice(0, 8).toUpperCase()}</p>
                          {qrCodes[tk.id] && <img src={qrCodes[tk.id]} alt="QR Code" className="mx-auto w-48 h-48" />}
                          <p className="text-xs text-muted mt-3">{t('myTickets.scanAtDoor')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-center text-xs text-muted">
                {t('myTickets.needHelp')} <a href="mailto:hello@tiklo.ca" className="text-primary hover:underline">hello@tiklo.ca</a>
              </p>
            </div>
          )
        ) : (
          /* Email form flow */
          <>
            <p className="text-muted text-sm mb-8">{t('myTickets.subtitle')}</p>
            {sent ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center space-y-3">
                <p className="text-2xl">📬</p>
                <p className="font-semibold text-navy">{t('myTickets.sentTitle')}</p>
                <p className="text-sm text-muted">{t('myTickets.sentDesc', { email })}</p>
                <button onClick={() => { setSent(false); setEmail('') }} className="text-primary text-sm hover:underline mt-2 block mx-auto">
                  {t('myTickets.sendAnother')}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
                  <div>
                    <label className="block text-sm text-muted mb-1">{t('myTickets.emailLabel')}</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <button
                    type="submit" disabled={sending}
                    className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    {sending ? t('myTickets.sending') : t('myTickets.submit')}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
