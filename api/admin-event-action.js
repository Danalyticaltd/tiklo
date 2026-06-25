import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.tiklo.ca'

const btnStyle = 'display:inline-block;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;'

function logoHtml() {
  return `<div style="display:table;margin-bottom:24px;">
    <img src="https://www.tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
    <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#635BFF;">o</span></span>
  </div>`
}

async function sendApprovedEmail(event, organizer) {
  const eventUrl = `${APP_URL}/events/${event.id}`
  const dashUrl  = `${APP_URL}/dashboard/events/${event.id}`
  const eventDate = new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: organizer.email,
    subject: `🎉 Your event is live — ${event.title}`,
    html: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
      ${logoHtml()}
      <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">Your event is approved and live!</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${organizer.full_name ?? 'there'}, your event has been reviewed and is now published. Buyers can start purchasing tickets.</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px;font-size:18px;color:#111827;">${event.title}</h3>
        <p style="margin:0;font-size:14px;color:#6b7280;">${eventDate} · ${event.city ?? ''}</p>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
        <a href="${eventUrl}" style="${btnStyle}background:#635BFF;color:#fff;">View event page</a>
        <a href="${dashUrl}" style="${btnStyle}background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">Go to dashboard</a>
      </div>

      <p style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;padding-top:16px;">
        Share your event link with your audience: <a href="${eventUrl}" style="color:#635BFF;">${eventUrl}</a>
      </p>
    </body></html>`,
  })
}

async function sendRejectedEmail(event, organizer) {
  const dashUrl = `${APP_URL}/dashboard/events/${event.id}`

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: organizer.email,
    subject: `Action needed — ${event.title}`,
    html: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
      ${logoHtml()}
      <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">Your event needs some changes</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${organizer.full_name ?? 'there'}, we reviewed your event and moved it back to draft. Please make the necessary changes and resubmit.</p>

      <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px;font-size:18px;color:#111827;">${event.title}</h3>
        <p style="margin:0;font-size:14px;color:#92400e;">Status: moved back to draft</p>
      </div>

      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Common reasons an event is sent back:</p>
      <ul style="font-size:14px;color:#6b7280;margin:0 0 24px;padding-left:20px;line-height:1.8;">
        <li>Missing or low-quality cover image</li>
        <li>Incomplete event description</li>
        <li>Unclear ticket pricing or details</li>
      </ul>

      <a href="${dashUrl}" style="${btnStyle}background:#635BFF;color:#fff;">Edit &amp; resubmit</a>

      <p style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
        Questions? Reply to this email and we'll help you get your event published.
      </p>
    </body></html>`,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

  const { eventId, action } = req.body
  if (!eventId || !action) return res.status(400).json({ error: 'eventId and action required' })

  try {
    if (action === 'approve') {
      const { data: event, error } = await supabase
        .from('events')
        .update({ status: 'published' })
        .eq('id', eventId)
        .select('*, profiles!organizer_id(full_name, email)')
        .single()
      if (error) throw error
      const organizer = event.profiles
      if (organizer?.email) {
        await sendApprovedEmail(event, organizer).catch(e =>
          console.error('[admin-event-action] approve email failed:', e.message)
        )
      }
      return res.json({ ok: true })
    }

    if (action === 'reject') {
      const { data: event, error } = await supabase
        .from('events')
        .update({ status: 'draft' })
        .eq('id', eventId)
        .select('*, profiles!organizer_id(full_name, email)')
        .single()
      if (error) throw error
      const organizer = event.profiles
      if (organizer?.email) {
        await sendRejectedEmail(event, organizer).catch(e =>
          console.error('[admin-event-action] reject email failed:', e.message)
        )
      }
      return res.json({ ok: true })
    }

    if (action === 'unpublish') {
      const { error } = await supabase.from('events').update({ status: 'draft' }).eq('id', eventId)
      if (error) throw error
      return res.json({ ok: true })
    }

    if (action === 'cancel') {
      const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId)
      if (error) throw error
      return res.json({ ok: true })
    }

    if (action === 'delete') {
      const steps = [
        supabase.from('tickets').delete().eq('event_id', eventId),
        supabase.from('orders').delete().eq('event_id', eventId),
        supabase.from('ticket_types').delete().eq('event_id', eventId),
      ]
      for (const step of steps) {
        const { error } = await step
        if (error) throw error
      }
      const { error } = await supabase.from('events').delete().eq('id', eventId)
      if (error) throw error
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    console.error('admin-event-action error:', err)
    return res.status(500).json({ error: err.message })
  }
}
