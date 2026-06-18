import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'

export default function CheckIn() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [result, setResult] = useState(null) // { ok, message, ticket }
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)
  const processingRef = useRef(false)

  useEffect(() => {
    supabase.from('events').select('title').eq('id', eventId).single()
      .then(({ data }) => setEvent(data))
  }, [eventId])

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (processingRef.current) return
        processingRef.current = true
        setScanning(true)
        await handleScan(decodedText)
        setTimeout(() => { processingRef.current = false; setScanning(false) }, 3000)
      },
      () => {}
    ).catch(console.error)

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  async function handleScan(qrCode) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, events(title), ticket_types(name)')
      .eq('qr_code', qrCode)
      .eq('event_id', eventId)
      .single()

    if (!ticket) {
      setResult({ ok: false, message: 'Ticket not found or wrong event.' })
      return
    }

    if (ticket.checked_in) {
      setResult({ ok: false, message: `Already checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()}`, ticket })
      return
    }

    await supabase.from('tickets').update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    }).eq('id', ticket.id)

    setResult({ ok: true, message: 'Valid ticket — checked in!', ticket })
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 mb-6">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Check-In Scanner</h1>
        {event && <p className="text-muted text-sm mb-6">{event.title}</p>}

        {/* Scanner */}
        <div className="bg-white rounded-2xl overflow-hidden mb-6 border border-gray-100 shadow-sm">
          <div id="qr-reader" className="w-full" />
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-2xl p-5 flex items-start gap-4 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.ok
              ? <CheckCircle size={28} className="text-green-500 shrink-0 mt-0.5" />
              : <XCircle size={28} className="text-red-500 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-semibold text-lg ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
              {result.ticket && (
                <div className="mt-2 text-sm text-muted space-y-0.5">
                  <p><span className="text-gray-700">{result.ticket.buyer_name}</span></p>
                  <p>{result.ticket.ticket_types?.name}</p>
                  <p className="font-mono text-xs">{result.ticket.id.slice(0, 8).toUpperCase()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {scanning && !result && (
          <p className="text-center text-muted text-sm animate-pulse">Processing…</p>
        )}
      </div>
    </div>
  )
}
