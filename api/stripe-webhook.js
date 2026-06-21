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

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object
    const orderId = intent.metadata?.order_id
    if (!orderId) return res.status(200).end()

    try {
      // Mark order as paid
      const { data: order } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
        .select('*, ticket_types(name, price, quantity, quantity_sold), events(title, event_date, location, organizer_id, profiles!organizer_id(email, full_name))')
        .single()

      if (!order) return res.status(200).end()

      // Guard against oversell: verify capacity hasn't been exceeded since checkout was created
      const { data: freshTT } = await supabase
        .from('ticket_types')
        .select('quantity, quantity_sold')
        .eq('id', order.ticket_type_id)
        .single()

      if (freshTT && (freshTT.quantity_sold + order.quantity) > freshTT.quantity) {
        console.warn(`Oversell prevented for order ${orderId}: would exceed capacity`)
        await stripe.refunds.create({ payment_intent: intent.id })
        await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)
        return res.status(200).end()
      }

      // Generate individual tickets
      const tickets = Array.from({ length: order.quantity }, () => ({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: order.ticket_type_id,
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        // qr_code defaults to gen_random_uuid() in DB, but we set it here for email
        qr_code: crypto.randomUUID(),
      }))

      const { data: createdTickets } = await supabase
        .from('tickets')
        .insert(tickets)
        .select()

      // Send buyer ticket email + organizer sale notification
      await Promise.all([
        sendTicketEmail(order, createdTickets),
        sendOrganizerNotification(order),
      ])

    } catch (err) {
      console.error('Webhook processing error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(200).json({ received: true })
}

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
    const ix = 20, ib = height - 63  // icon left-x, icon bottom-y
    // Rounded square outer (r=11, matches TikloLogo border-radius) — drawRectangle ignores borderRadius so use SVG path
    const rrOuter = `M 11 0 L 35 0 Q 46 0 46 11 L 46 35 Q 46 46 35 46 L 11 46 Q 0 46 0 35 L 0 11 Q 0 0 11 0 Z`
    page.drawSvgPath(rrOuter, { x: ix, y: ib + 46, color: rgb(1, 0.341, 0.2) })
    // Ticket body (inner rounded rect, semi-transparent white)
    const iw = Math.round(34*s), ih = Math.round(18*s), ir = Math.round(4.5*s)
    const rrInner = `M ${ir} 0 L ${iw-ir} 0 Q ${iw} 0 ${iw} ${ir} L ${iw} ${ih-ir} Q ${iw} ${ih} ${iw-ir} ${ih} L ${ir} ${ih} Q 0 ${ih} 0 ${ih-ir} L 0 ${ir} Q 0 0 ${ir} 0 Z`
    page.drawSvgPath(rrInner, { x: ix + Math.round(7*s), y: ib + Math.round(14*s) + ih,
      color: rgb(1,1,1), opacity: 0.25, borderColor: rgb(1,1,1), borderWidth: 1.6 })
    // Notch circles (coral — bites into ticket edges)
    page.drawCircle({ x: ix + 7*s, y: ib + 23*s, size: 5*s, color: rgb(1, 0.341, 0.2) })
    page.drawCircle({ x: ix + 41*s, y: ib + 23*s, size: 5*s, color: rgb(1, 0.341, 0.2) })
    // Dashed centre line
    page.drawLine({ start: { x: ix + 14*s, y: ib + 23*s }, end: { x: ix + 34*s, y: ib + 23*s },
      thickness: 1.5, color: rgb(1,1,1), dashArray: [3, 2.5], dashPhase: 0 })
    // Centre dot
    page.drawCircle({ x: ix + 24*s, y: ib + 27*s, size: 2.4, color: rgb(1,1,1) })

    // Wordmark: "Tikl" dark + "o" coral, 6px gap after icon
    const wX = ix + 46 + 6
    const wY = height - 50
    const tiklW = font.widthOfTextAtSize('Tikl', 28)
    page.drawText('Tikl', { x: wX, y: wY, size: 28, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('o', { x: wX + tiklW, y: wY, size: 28, font, color: rgb(1, 0.341, 0.2) })

    // Event title
    page.drawText(event.title, { x: 24, y: height - 110, size: 16, font, color: rgb(0.1, 0.1, 0.1), maxWidth: width - 48 })
    page.drawText(eventDate, { x: 24, y: height - 135, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
    if (event.location) {
      page.drawText(event.location, { x: 24, y: height - 152, size: 11, font: fontReg, color: rgb(0.4, 0.4, 0.4) })
    }

    // Divider
    page.drawLine({ start: { x: 24, y: height - 170 }, end: { x: width - 24, y: height - 170 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })

    // Ticket holder info
    page.drawText('Ticket Holder', { x: 24, y: height - 195, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(order.buyer_name, { x: 24, y: height - 213, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('Ticket Type', { x: 24, y: height - 238, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(ticketType.name, { x: 24, y: height - 256, size: 14, font, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('Ticket ID', { x: 24, y: height - 281, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(ticket.id.slice(0, 8).toUpperCase(), { x: 24, y: height - 299, size: 13, font, color: rgb(1, 0.341, 0.2) })

    // QR code
    const qrBuffer = await QRCode.toBuffer(ticket.qr_code, { width: 180, margin: 1 })
    const qrImage = await pdfDoc.embedPng(qrBuffer)
    const qrSize = 180
    page.drawImage(qrImage, { x: (width - qrSize) / 2, y: height - 500, width: qrSize, height: qrSize })
    page.drawText('Scan at the door — single use', { x: 24, y: height - 520, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) })

    // Footer
    page.drawRectangle({ x: 0, y: 0, width, height: 36, color: rgb(0.97, 0.97, 0.97) })
    page.drawText('tiklo.ca', { x: 24, y: 12, size: 10, font: fontReg, color: rgb(0.6, 0.6, 0.6) })
  }

  return Buffer.from(await pdfDoc.save())
}

async function sendTicketEmail(order, tickets) {
  const event = order.events
  const ticketType = order.ticket_types

  // QR code via public URL (works in all email clients including Gmail)
  const ticketRows = tickets.map((t, i) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(t.qr_code)}&margin=1`
    return `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
        <p style="margin:0 0 8px;font-weight:600;color:#1f2937;">${ticketType.name}</p>
        <img src="${qrUrl}" alt="QR Code" width="180" height="180" style="display:block;margin:0 auto;" />
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Ticket ID: ${t.id.slice(0, 8).toUpperCase()}</p>
      </div>
    `
  })

  // Generate PDF and attach
  const pdfBuffer = await generateTicketPdf(order, tickets)
  const attachments = [{ filename: 'tiklo-ticket.pdf', content: pdfBuffer.toString('base64') }]

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: order.buyer_email,
    subject: `Your tickets for ${event.title}`,
    attachments,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <div style="display:table;margin-bottom:20px;">
          <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
          <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#FF5733;">o</span></span>
        </div>
        <p style="color:#6b7280;margin-bottom:24px;">Your tickets are confirmed!</p>

        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h2 style="margin:0 0 8px;font-size:18px;">${event.title}</h2>
          <p style="margin:4px 0;color:#6b7280;font-size:14px;">
            📅 ${new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
          ${event.location ? `<p style="margin:4px 0;color:#6b7280;font-size:14px;">📍 ${event.location}</p>` : ''}
        </div>

        <p style="font-weight:600;margin-bottom:12px;">Your ${tickets.length} ticket${tickets.length > 1 ? 's' : ''}:</p>
        ${ticketRows.join('')}

        <p style="color:#6b7280;font-size:12px;margin-top:24px;">
          A printable PDF ticket is attached to this email.<br/>
          Show the QR code at the door. Each code is single-use.<br/>
          Questions? Reply to this email.
        </p>
      </body>
      </html>
    `,
  })
}

async function sendOrganizerNotification(order) {
  const event = order.events
  const organizer = event?.profiles
  if (!organizer?.email) return

  const ticketType = order.ticket_types
  const subtotal = Number(order.subtotal ?? 0)
  const fee = Number(order.platform_fee ?? 0)
  const net = subtotal - fee
  const totalCapacity = ticketType?.quantity ?? 0
  const sold = (ticketType?.quantity_sold ?? 0) + order.quantity
  const remaining = Math.max(0, totalCapacity - sold)

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: organizer.email,
    subject: `New sale: ${order.quantity} ticket${order.quantity > 1 ? 's' : ''} for ${event.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <div style="display:table;margin-bottom:20px;">
          <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
          <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#FF5733;">o</span></span>
        </div>
        <p style="color:#6b7280;margin-bottom:24px;">You just made a sale!</p>

        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="margin:0 0 12px;font-size:18px;">${event.title}</h2>
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="color:#6b7280;padding:4px 0;">Buyer</td><td style="text-align:right;font-weight:600;">${order.buyer_name}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Buyer email</td><td style="text-align:right;">${order.buyer_email}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Ticket type</td><td style="text-align:right;">${ticketType?.name}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Quantity sold</td><td style="text-align:right;font-weight:600;">${order.quantity}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Tickets remaining</td><td style="text-align:right;font-weight:600;color:${remaining < 10 ? '#ef4444' : '#16a34a'};">${remaining} / ${totalCapacity}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Subtotal</td><td style="text-align:right;">$${subtotal.toFixed(2)} CAD</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Platform fee</td><td style="text-align:right;">−$${fee.toFixed(2)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:8px 0 4px;font-weight:700;">Your earnings</td>
              <td style="text-align:right;font-weight:700;color:#FF5733;">$${net.toFixed(2)} CAD</td>
            </tr>
          </table>
        </div>

        <p style="color:#6b7280;font-size:12px;">Your earnings will be transferred to your bank account by Danalytica Ltd within 2–5 business days.</p>
      </body>
      </html>
    `,
  })
}
