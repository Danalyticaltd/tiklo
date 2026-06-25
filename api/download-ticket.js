import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { check, getIp } from './_lib/rateLimit.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function generateTicketPdf(order, tickets) {
  const event = order.events
  const ticketType = order.ticket_types
  const eventDate = new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  for (const ticket of tickets) {
    const page = pdfDoc.addPage([420, 600])
    const { width, height } = page.getSize()

    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(1, 1, 1) })
    page.drawLine({ start: { x: 0, y: height - 80 }, end: { x: width, y: height - 80 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) })

    const s = 46 / 48
    const ix = 20, ib = height - 63
    const rrOuter = `M 11 0 L 35 0 Q 46 0 46 11 L 46 35 Q 46 46 35 46 L 11 46 Q 0 46 0 35 L 0 11 Q 0 0 11 0 Z`
    page.drawSvgPath(rrOuter, { x: ix, y: ib + 46, color: rgb(0.388, 0.357, 1.0) })
    const iw = Math.round(34*s), ih = Math.round(18*s), ir = Math.round(4.5*s)
    const rrInner = `M ${ir} 0 L ${iw-ir} 0 Q ${iw} 0 ${iw} ${ir} L ${iw} ${ih-ir} Q ${iw} ${ih} ${iw-ir} ${ih} L ${ir} ${ih} Q 0 ${ih} 0 ${ih-ir} L 0 ${ir} Q 0 0 ${ir} 0 Z`
    page.drawSvgPath(rrInner, { x: ix + Math.round(7*s), y: ib + Math.round(14*s) + ih,
      color: rgb(1,1,1), opacity: 0.25, borderColor: rgb(1,1,1), borderWidth: 1.6 })
    page.drawCircle({ x: ix + 7*s, y: ib + 23*s, size: 5*s, color: rgb(0.388, 0.357, 1.0) })
    page.drawCircle({ x: ix + 41*s, y: ib + 23*s, size: 5*s, color: rgb(0.388, 0.357, 1.0) })
    page.drawLine({ start: { x: ix + 14*s, y: ib + 23*s }, end: { x: ix + 34*s, y: ib + 23*s },
      thickness: 1.5, color: rgb(1,1,1), dashArray: [3, 2.5], dashPhase: 0 })
    page.drawCircle({ x: ix + 24*s, y: ib + 27*s, size: 2.4, color: rgb(1,1,1) })

    const wX = ix + 46 + 6
    const wY = height - 50
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
    page.drawText(ticketType.name, { x: 24, y: height - 256, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('Ticket ID', { x: 24, y: height - 281, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(ticket.id.slice(0, 8).toUpperCase(), { x: 24, y: height - 299, size: 13, font, color: rgb(0.388, 0.357, 1.0) })

    const qrBuffer = await QRCode.toBuffer(ticket.qr_code, { width: 180, margin: 1 })
    const qrImage = await pdfDoc.embedPng(qrBuffer)
    page.drawImage(qrImage, { x: (width - 180) / 2, y: height - 500, width: 180, height: 180 })
    page.drawText('Scan at the door — single use', { x: 24, y: height - 520, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawRectangle({ x: 0, y: 0, width, height: 36, color: rgb(0.97, 0.97, 0.97) })
    page.drawText('tiklo.ca', { x: 24, y: 12, size: 10, font: fontReg, color: rgb(0.6, 0.6, 0.6) })
  }

  return Buffer.from(await pdfDoc.save())
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const ip = getIp(req)
  const { allowed } = check(`pdf:${ip}`, 20, 60_000)
  if (!allowed) return res.status(429).json({ error: 'Too many requests.' })

  const { order_id } = req.query
  if (!order_id) return res.status(400).json({ error: 'order_id required' })

  const { data: order } = await supabase
    .from('orders')
    .select('*, events(title, event_date, location), ticket_types(name)')
    .eq('id', order_id)
    .single()

  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'paid') return res.status(400).json({ error: 'Tickets not yet available' })

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('order_id', order_id)

  if (!tickets?.length) return res.status(404).json({ error: 'No tickets found for this order' })

  try {
    const pdfBuffer = await generateTicketPdf(order, tickets)
    const filename = `tiklo-ticket-${order_id.slice(0, 8).toUpperCase()}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (err) {
    console.error('download-ticket error:', err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
}
