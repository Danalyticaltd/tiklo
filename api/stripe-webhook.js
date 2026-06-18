import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import QRCode from 'qrcode'

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
        .select('*, ticket_types(name, price), events(title, event_date, location, organizer_id, profiles(email, full_name))')
        .single()

      if (!order) return res.status(200).end()

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

      // Update quantity_sold
      await supabase.rpc('increment_quantity_sold', {
        p_ticket_type_id: order.ticket_type_id,
        p_quantity: order.quantity,
      })

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

async function sendTicketEmail(order, tickets) {
  const event = order.events
  const ticketType = order.ticket_types

  // Generate QR code data URLs for each ticket
  const ticketRows = await Promise.all(
    tickets.map(async (t) => {
      const qrDataUrl = await QRCode.toDataURL(t.qr_code, { width: 200, margin: 1 })
      return `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
          <p style="margin:0 0 8px;font-weight:600;color:#1f2937;">${ticketType.name}</p>
          <img src="${qrDataUrl}" alt="QR Code" width="160" height="160" />
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Ticket ID: ${t.id.slice(0, 8).toUpperCase()}</p>
        </div>
      `
    })
  )

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: order.buyer_email,
    subject: `Your tickets for ${event.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <h1 style="font-size:24px;font-weight:800;color:#7C3AED;margin-bottom:4px;">Tiklo</h1>
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
          Show this QR code at the door. Each code is single-use.<br/>
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

  const subtotal = Number(order.subtotal ?? 0)
  const fee = Number(order.platform_fee ?? 0)
  const net = subtotal - fee

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: organizer.email,
    subject: `🎟 New sale: ${order.quantity} ticket${order.quantity > 1 ? 's' : ''} for ${event.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <h1 style="font-size:24px;font-weight:800;color:#7C3AED;margin-bottom:4px;">Tiklo</h1>
        <p style="color:#6b7280;margin-bottom:24px;">You just made a sale!</p>

        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="margin:0 0 12px;font-size:18px;">${event.title}</h2>
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="color:#6b7280;padding:4px 0;">Buyer</td><td style="text-align:right;font-weight:600;">${order.buyer_name}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Email</td><td style="text-align:right;">${order.buyer_email}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Tickets</td><td style="text-align:right;font-weight:600;">${order.quantity} × ${order.ticket_types?.name}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Subtotal</td><td style="text-align:right;">$${subtotal.toFixed(2)} CAD</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Platform fee</td><td style="text-align:right;">−$${fee.toFixed(2)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:8px 0 4px;font-weight:700;">Your earnings</td>
              <td style="text-align:right;font-weight:700;color:#7C3AED;">$${net.toFixed(2)} CAD</td>
            </tr>
          </table>
        </div>

        <p style="color:#6b7280;font-size:12px;">Your earnings will be transferred to your bank account by Danalytica Ltd within 2–5 business days.</p>
      </body>
      </html>
    `,
  })
}
