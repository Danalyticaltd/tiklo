import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const LOGO = `
  <div style="display:table;margin-bottom:20px;">
    <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
    <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#635BFF;">o</span></span>
  </div>`

function eventBlock(event) {
  const date = new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })
  return `
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#1f2937;">${event.title}</h2>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">📅 ${date}</p>
      ${event.location ? `<p style="margin:4px 0;color:#6b7280;font-size:14px;">📍 ${event.location}</p>` : ''}
    </div>`
}

function wrap(body) {
  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">${LOGO}${body}<p style="color:#6b7280;font-size:12px;margin-top:24px;">Questions? Reply to this email or contact us at hello@tiklo.ca</p></body></html>`
}

async function send7DayReminders() {
  // Events happening in 7 days (date match), orders not yet reminded
  const target = new Date()
  target.setDate(target.getDate() + 7)
  const dateStr = target.toISOString().slice(0, 10)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, events(title, event_date, location, city), ticket_types(name)')
    .eq('status', 'paid')
    .eq('reminder_7day_sent', false)
    .gte('events.event_date', `${dateStr}T00:00:00`)
    .lt('events.event_date', `${dateStr}T23:59:59`)

  if (!orders?.length) return 0
  let sent = 0
  for (const order of orders) {
    const event = order.events
    if (!event || !order.buyer_email) continue
    try {
      await resend.emails.send({
        from: 'Tiklo <tickets@tiklo.ca>',
        to: order.buyer_email,
        subject: `1 week to go — ${event.title} is coming up!`,
        html: wrap(`
          <p style="color:#6b7280;margin-bottom:20px;">Hi ${order.buyer_name}, just a heads-up — your event is one week away!</p>
          ${eventBlock(event)}
          <p style="font-size:14px;color:#374151;margin-bottom:8px;">Your QR code ticket was sent in your original confirmation email. Make sure to have it ready at the door.</p>
          <a href="https://tiklo.ca" style="display:inline-block;margin-top:8px;background:#635BFF;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Browse more events</a>
        `),
      })
      await supabase.from('orders').update({ reminder_7day_sent: true }).eq('id', order.id)
      sent++
    } catch (err) { console.error('[send-reminders]', err.message) }
  }
  return sent
}

async function send1DayReminders() {
  const target = new Date()
  target.setDate(target.getDate() + 1)
  const dateStr = target.toISOString().slice(0, 10)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, events(title, event_date, location, city), ticket_types(name)')
    .eq('status', 'paid')
    .eq('reminder_1day_sent', false)
    .gte('events.event_date', `${dateStr}T00:00:00`)
    .lt('events.event_date', `${dateStr}T23:59:59`)

  if (!orders?.length) return 0
  let sent = 0
  for (const order of orders) {
    const event = order.events
    if (!event || !order.buyer_email) continue
    try {
      await resend.emails.send({
        from: 'Tiklo <tickets@tiklo.ca>',
        to: order.buyer_email,
        subject: `Tomorrow: ${event.title} — See you there!`,
        html: wrap(`
          <p style="color:#6b7280;margin-bottom:20px;">Hi ${order.buyer_name}, your event is tomorrow! Here's a quick reminder.</p>
          ${eventBlock(event)}
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#c2410c;">What to bring</p>
            <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;">
              <li>Your QR code ticket (from your confirmation email)</li>
              <li>A valid ID if required by the organizer</li>
            </ul>
          </div>
          <p style="font-size:14px;color:#374151;">Can't find your ticket? Check your original confirmation email or reply here and we'll help.</p>
        `),
      })
      await supabase.from('orders').update({ reminder_1day_sent: true }).eq('id', order.id)
      sent++
    } catch (err) { console.error('[send-reminders]', err.message) }
  }
  return sent
}

async function sendThankYouEmails() {
  // Events that ended yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().slice(0, 10)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, events(title, event_date, location, city), ticket_types(name)')
    .eq('status', 'paid')
    .eq('thankyou_sent', false)
    .gte('events.event_date', `${dateStr}T00:00:00`)
    .lt('events.event_date', `${dateStr}T23:59:59`)

  if (!orders?.length) return 0
  let sent = 0
  for (const order of orders) {
    const event = order.events
    if (!event || !order.buyer_email) continue
    try {
      await resend.emails.send({
        from: 'Tiklo <tickets@tiklo.ca>',
        to: order.buyer_email,
        subject: `Thanks for attending ${event.title}!`,
        html: wrap(`
          <p style="color:#6b7280;margin-bottom:20px;">Hi ${order.buyer_name}, thank you for attending <strong>${event.title}</strong>. We hope you had a great time!</p>
          <p style="font-size:14px;color:#374151;margin-bottom:20px;">
            Discover more upcoming events in your city and keep the experience going.
          </p>
          <a href="https://tiklo.ca" style="display:inline-block;background:#635BFF;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Browse upcoming events</a>
        `),
      })
      await supabase.from('orders').update({ thankyou_sent: true }).eq('id', order.id)
      sent++
    } catch (err) { console.error('[send-reminders]', err.message) }
  }
  return sent
}

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  const auth = req.headers.authorization
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const [r7, r1, rt] = await Promise.all([
      send7DayReminders(),
      send1DayReminders(),
      sendThankYouEmails(),
    ])
    console.log(`[send-reminders] 7day=${r7} 1day=${r1} thankyou=${rt}`)
    res.json({ ok: true, sent: { reminder_7day: r7, reminder_1day: r1, thankyou: rt } })
  } catch (err) {
    console.error('[send-reminders]', err)
    res.status(500).json({ error: err.message })
  }
}
