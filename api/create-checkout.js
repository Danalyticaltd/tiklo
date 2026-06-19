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

// Fee structure: 2.5% + $0.99 per ticket
function calcFee(price, quantity) {
  if (price === 0) return 0
  const subtotal = price * quantity
  return Math.round(subtotal * 0.025 * 100 + 99 * quantity) // in cents
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

    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.863, 0.369, 0.239) })
    page.drawText('Tiklo', { x: 24, y: height - 52, size: 28, font, color: rgb(1, 1, 1) })
    page.drawText(event.title, { x: 24, y: height - 110, size: 16, font, color: rgb(0.1, 0.1, 0.1), maxWidth: width - 48 })
    page.drawText(eventDate, { x: 24, y: height - 135, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
    if (event.location) page.drawText(event.location, { x: 24, y: height - 152, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
    page.drawLine({ start: { x: 24, y: height - 170 }, end: { x: width - 24, y: height - 170 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
    page.drawText('Ticket Holder', { x: 24, y: height - 195, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(order.buyer_name, { x: 24, y: height - 213, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('Ticket Type', { x: 24, y: height - 238, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(ticketType.name, { x: 24, y: height - 256, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('Ticket ID', { x: 24, y: height - 281, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(ticket.id.slice(0, 8).toUpperCase(), { x: 24, y: height - 299, size: 13, font, color: rgb(0.863, 0.369, 0.239) })
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
        <h1 style="font-size:24px;font-weight:800;color:#DC5E3D;margin-bottom:4px;">Tiklo</h1>
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
    // Fetch ticket type + event
    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('*, events(organizer_id, title, event_date, location, profiles!organizer_id(email, full_name))')
      .eq('id', ticket_type_id)
      .single()

    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' })

    const unitAmount = Math.round(ticketType.price * 100) // cents
    const subtotal = ticketType.price * quantity
    const platformFeeCents = calcFee(ticketType.price, quantity)

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
