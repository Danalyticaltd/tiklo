import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function fetchFeeRates() {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['fee_percent', 'fee_flat_cents'])
  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return {
    feePercent:   parseFloat(map.fee_percent    ?? '2.5'),
    feeFlatCents: parseInt(map.fee_flat_cents ?? '99', 10),
  }
}

function calcFee(price, quantity, feePercent, feeFlatCents) {
  if (price === 0) return 0
  const subtotal = price * quantity
  return Math.round(subtotal * (feePercent / 100) * 100 + feeFlatCents * quantity)
}

// ── Free-ticket fulfilment (mirrors webhook logic) ──────────────────────────

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

    // White header + separator
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(1, 1, 1) })
    page.drawLine({ start: { x: 0, y: height - 80 }, end: { x: width, y: height - 80 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) })

    // Icon: coral rounded square (matches TikloLogo.jsx viewBox 0 0 48 48, rendered at 46×46)
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

    // Wordmark: "Tikl" dark + "o" coral, 6px gap after icon
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

async function fulfilFreeOrder(order, tickets) {
  const event = order.events
  const ticketType = order.ticket_types

  const ticketRows = tickets.map(t => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(t.qr_code)}&margin=1`
    return `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
        <p style="margin:0 0 8px;font-weight:600;color:#1f2937;">${ticketType.name}</p>
        <img src="${qrUrl}" alt="QR Code" width="180" height="180" style="display:block;margin:0 auto;" />
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Ticket ID: ${t.id.slice(0, 8).toUpperCase()}</p>
      </div>
    `
  })

  const pdfBuffer = await generateTicketPdf(order, tickets)

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: order.buyer_email,
    subject: `Your free tickets for ${event.title}`,
    attachments: [{ filename: 'tiklo-ticket.pdf', content: pdfBuffer.toString('base64') }],
    html: `
      <!DOCTYPE html><html>
      <body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <div style="display:table;margin-bottom:20px;">
          <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
          <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#635BFF;">o</span></span>
        </div>
        <p style="color:#6b7280;margin-bottom:24px;">You're registered — your tickets are below!</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h2 style="margin:0 0 8px;font-size:18px;">${event.title}</h2>
          <p style="margin:4px 0;color:#6b7280;font-size:14px;">📅 ${new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}</p>
          ${event.location ? `<p style="margin:4px 0;color:#6b7280;font-size:14px;">📍 ${event.location}</p>` : ''}
        </div>
        <p style="font-weight:600;margin-bottom:12px;">Your ${tickets.length} ticket${tickets.length > 1 ? 's' : ''}:</p>
        ${ticketRows.join('')}
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">A printable PDF is attached. Show the QR code at the door.</p>
      </body></html>
    `,
  })
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event_id, ticket_type_id, quantity, buyer_name, buyer_email } = req.body

  // Input validation
  if (!buyer_name?.trim())  return res.status(400).json({ error: 'Buyer name is required' })
  if (!buyer_email?.trim()) return res.status(400).json({ error: 'Buyer email is required' })
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' })

  try {
    // Fetch fee rates from DB (live — no cache) + ticket type + event in parallel
    const [{ feePercent, feeFlatCents }, { data: ticketType }] = await Promise.all([
      fetchFeeRates(),
      supabase
        .from('ticket_types')
        .select('*, events(id, status, event_date, organizer_id, title, location, profiles!organizer_id(email, full_name))')
        .eq('id', ticket_type_id)
        .single(),
    ])

    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' })

    const maxPerOrder = ticketType.max_per_order ?? 10
    if (quantity > maxPerOrder) {
      return res.status(400).json({ error: `Maximum ${maxPerOrder} ticket${maxPerOrder !== 1 ? 's' : ''} per order for this ticket type` })
    }

    const ev = ticketType.events
    if (!ev || ev.status !== 'published') {
      return res.status(400).json({ error: 'This event is no longer available for booking' })
    }
    if (new Date(ev.event_date) < new Date()) {
      return res.status(400).json({ error: 'This event has already passed' })
    }

    const unitAmount = Math.round(ticketType.price * 100) // cents
    const subtotal = ticketType.price * quantity
    const platformFeeCents = calcFee(ticketType.price, quantity, feePercent, feeFlatCents)

    // Create the order first (pending), then atomically reserve tickets.
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      event_id,
      ticket_type_id,
      buyer_email: buyer_email.trim(),
      buyer_name: buyer_name.trim(),
      quantity,
      subtotal,
      platform_fee: platformFeeCents / 100,
      status: 'pending',
    }).select().single()

    if (orderErr) throw orderErr

    // ── Atomic reservation — single UPDATE, no race window ──
    const { data: reserved, error: reserveErr } = await supabase.rpc('try_reserve_tickets', {
      p_ticket_type_id: ticket_type_id,
      p_quantity: quantity,
    })

    if (reserveErr || !reserved) {
      // Clean up the pending order we just created
      await supabase.from('orders').delete().eq('id', order.id)
      const { data: tt } = await supabase.from('ticket_types').select('quantity, quantity_sold').eq('id', ticket_type_id).single()
      const left = tt ? tt.quantity - tt.quantity_sold : 0
      return res.status(409).json({ error: left === 0 ? 'Sold out' : `Only ${left} ticket${left > 1 ? 's' : ''} remaining` })
    }

    // ── Free tickets: fulfil immediately (no Stripe) ──
    if (unitAmount === 0) {
      const ticketRows = Array.from({ length: quantity }, () => ({
        order_id: order.id,
        event_id,
        ticket_type_id,
        buyer_name: buyer_name.trim(),
        buyer_email: buyer_email.trim(),
        qr_code: crypto.randomUUID(),
      }))

      const { data: createdTickets, error: ticketErr } = await supabase
        .from('tickets')
        .insert(ticketRows)
        .select()

      if (ticketErr) throw ticketErr

      // Mark order paid (quantity_sold already incremented by try_reserve_tickets)
      await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)

      // Send confirmation email (non-blocking — don't fail the request if email fails)
      const fullOrder = {
        ...order,
        buyer_name: buyer_name.trim(),
        buyer_email: buyer_email.trim(),
        events: ticketType.events,
        ticket_types: { name: ticketType.name, price: ticketType.price },
      }
      fulfilFreeOrder(fullOrder, createdTickets).catch(err =>
        console.error('Free ticket email error:', err.message)
      )

      return res.json({ free: true, order_id: order.id })
    }

    // ── Paid tickets: create Stripe PaymentIntent ──
    // All funds collect to Tiklo's Stripe account. Tiklo pays organizers manually
    // via Interac or bank transfer after each event.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: unitAmount * quantity,
      currency: 'cad',
      metadata: { order_id: order.id, buyer_name: buyer_name.trim(), buyer_email: buyer_email.trim() },
    })

    await supabase.from('orders').update({
      stripe_payment_intent: paymentIntent.id,
    }).eq('id', order.id)

    res.json({ client_secret: paymentIntent.client_secret, order_id: order.id })
  } catch (err) {
    console.error('create-checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
