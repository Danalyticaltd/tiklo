import Footer from '../components/Footer'
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
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
  const [invalid, setInvalid] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!orderId) { setInvalid(true); setLoading(false); return }

      const { data: ord } = await supabase
        .from('orders')
        .select('*, events(title, event_date, location), ticket_types(name)')
        .eq('id', orderId)
        .single()

      if (!ord) { setInvalid(true); setLoading(false); return }
      setOrder(ord)

      const { data: tix } = await supabase
        .from('tickets')
        .select('*')
        .eq('order_id', orderId)

      const list = tix ?? []
      setTickets(list)

      // Generate all QR codes in parallel
      const entries = await Promise.all(
        list.map(async t => [t.id, await QRCode.toDataURL(t.qr_code, { width: 220, margin: 1, color: { dark: '#000', light: '#fff' } })])
      )
      setQrCodes(Object.fromEntries(entries))
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

  if (invalid) return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-5xl mb-4">🎟</p>
        <h1 className="text-xl font-bold text-navy mb-2">Ticket link not found</h1>
        <p className="text-muted text-sm mb-6">This link may be expired or invalid. Look up your tickets by email below.</p>
        <Link to="/my-tickets" className="bg-primary hover:bg-[#574BFF] text-white font-semibold px-6 py-2.5 rounded-xl transition">
          Find my tickets
        </Link>
      </div>
      <Footer />
    </div>
  )

  const event = order?.events
  const ticketTypeName = order?.ticket_types?.name
  const qty = tickets.length || order?.quantity || 0

  async function downloadPdf() {
    if (!order || !tickets.length) return
    setPdfLoading(true)
    try {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const eventDate = new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })

      for (const ticket of tickets) {
        const page = pdfDoc.addPage([420, 600])
        const { width, height } = page.getSize()

        page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(1, 1, 1) })
        page.drawLine({ start: { x: 0, y: height - 80 }, end: { x: width, y: height - 80 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) })

        const s = 46 / 48
        const ix = 20, ib = height - 63
        page.drawSvgPath(`M 11 0 L 35 0 Q 46 0 46 11 L 46 35 Q 46 46 35 46 L 11 46 Q 0 46 0 35 L 0 11 Q 0 0 11 0 Z`, { x: ix, y: ib + 46, color: rgb(0.388, 0.357, 1.0) })
        const iw = Math.round(34*s), ih = Math.round(18*s), ir = Math.round(4.5*s)
        page.drawSvgPath(`M ${ir} 0 L ${iw-ir} 0 Q ${iw} 0 ${iw} ${ir} L ${iw} ${ih-ir} Q ${iw} ${ih} ${iw-ir} ${ih} L ${ir} ${ih} Q 0 ${ih} 0 ${ih-ir} L 0 ${ir} Q 0 0 ${ir} 0 Z`, { x: ix + Math.round(7*s), y: ib + Math.round(14*s) + ih, color: rgb(1,1,1), opacity: 0.25, borderColor: rgb(1,1,1), borderWidth: 1.6 })
        page.drawCircle({ x: ix + 7*s, y: ib + 23*s, size: 5*s, color: rgb(0.388, 0.357, 1.0) })
        page.drawCircle({ x: ix + 41*s, y: ib + 23*s, size: 5*s, color: rgb(0.388, 0.357, 1.0) })
        page.drawLine({ start: { x: ix + 14*s, y: ib + 23*s }, end: { x: ix + 34*s, y: ib + 23*s }, thickness: 1.5, color: rgb(1,1,1), dashArray: [3, 2.5], dashPhase: 0 })
        page.drawCircle({ x: ix + 24*s, y: ib + 27*s, size: 2.4, color: rgb(1,1,1) })

        const wX = ix + 46 + 6, wY = height - 50
        const tiklW = font.widthOfTextAtSize('Tikl', 28)
        page.drawText('Tikl', { x: wX, y: wY, size: 28, font, color: rgb(0.1, 0.1, 0.1) })
        page.drawText('o', { x: wX + tiklW, y: wY, size: 28, font, color: rgb(0.388, 0.357, 1.0) })
        page.drawText(event.title, { x: 24, y: height - 110, size: 16, font, color: rgb(0.1, 0.1, 0.1), maxWidth: width - 48 })
        page.drawText(eventDate, { x: 24, y: height - 135, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
        if (event.location) page.drawText(event.location, { x: 24, y: height - 152, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
        page.drawLine({ start: { x: 24, y: height - 170 }, end: { x: width - 24, y: height - 170 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
        page.drawText('Ticket Holder', { x: 24, y: height - 195, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
        page.drawText(order.buyer_name, { x: 24, y: height - 213, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
        page.drawText('Ticket Type', { x: 24, y: height - 238, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
        page.drawText(ticketTypeName ?? '', { x: 24, y: height - 256, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
        page.drawText('Ticket ID', { x: 24, y: height - 281, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
        page.drawText(ticket.id.slice(0, 8).toUpperCase(), { x: 24, y: height - 299, size: 13, font, color: rgb(0.388, 0.357, 1.0) })

        // Embed QR from the data URL already loaded in state
        const dataUrl = qrCodes[ticket.id]
        if (dataUrl) {
          const base64 = dataUrl.split(',')[1]
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
          const qrImage = await pdfDoc.embedPng(bytes)
          page.drawImage(qrImage, { x: (width - 180) / 2, y: height - 500, width: 180, height: 180 })
        }
        page.drawText('Scan at the door — single use', { x: 24, y: height - 520, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
        page.drawRectangle({ x: 0, y: 0, width, height: 36, color: rgb(0.97, 0.97, 0.97) })
        page.drawText('tiklo.ca', { x: 24, y: 12, size: 10, font: fontReg, color: rgb(0.6, 0.6, 0.6) })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tiklo-ticket-${orderId.slice(0, 8).toUpperCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfLoading(false)
    }
  }

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
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
          >
            {pdfLoading ? 'Generating PDF…' : '🖨 Download / Print PDF'}
          </button>
          <div>
            <Link to="/my-tickets" className="text-xs text-muted hover:text-primary transition">
              Can't find your ticket later? → Find my tickets
            </Link>
          </div>
          <Link to="/">
            <Button variant="secondary">Browse more events</Button>
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
