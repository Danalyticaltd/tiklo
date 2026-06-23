import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'danalytica.ltd@gmail.com'
const APP_URL = process.env.VITE_APP_URL || 'https://tiklo.ca'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { event_id } = req.body
  if (!event_id) return res.status(400).json({ error: 'event_id required' })

  // Fetch event + organizer details
  const { data: event } = await supabase
    .from('events')
    .select('*, profiles!organizer_id(full_name, email)')
    .eq('id', event_id)
    .single()

  if (!event) return res.status(404).json({ error: 'Event not found' })
  if (event.organizer_id !== user.id) return res.status(403).json({ error: 'Forbidden' })
  if (event.status !== 'pending') return res.status(400).json({ error: 'Event is not pending approval' })

  const organizer = event.profiles
  const eventDate = new Date(event.event_date).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })
  const previewUrl = `${APP_URL}/events/${event_id}`
  const adminUrl = `${APP_URL}/admin`

  const btnStyle = 'display:inline-block;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;'

  await resend.emails.send({
    from: 'Tiklo <tickets@tiklo.ca>',
    to: ADMIN_EMAIL,
    replyTo: organizer?.email,
    subject: `[Review needed] ${event.title} — submitted for approval`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
        <div style="display:table;margin-bottom:24px;">
          <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
          <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#635BFF;">o</span></span>
        </div>

        <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">New event submitted for approval</h2>
        <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">An organizer has submitted an event and is waiting for your review.</p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h3 style="margin:0 0 12px;font-size:18px;color:#111827;">${event.title}</h3>
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="color:#6b7280;padding:4px 0;width:130px;">Date &amp; time</td><td style="font-weight:500;">${eventDate}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">City</td><td style="font-weight:500;">${event.city ?? '—'}</td></tr>
            ${event.location ? `<tr><td style="color:#6b7280;padding:4px 0;">Venue</td><td style="font-weight:500;">${event.location}</td></tr>` : ''}
            <tr><td style="color:#6b7280;padding:4px 0;">Event type</td><td style="font-weight:500;">${event.event_type ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Community</td><td style="font-weight:500;">${event.community_tag ?? '—'}</td></tr>
          </table>
        </div>

        <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">Organizer</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#1f2937;">${organizer?.full_name ?? 'Unknown'}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${organizer?.email ?? '—'}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#92400e;">↑ Reply to this email to contact the organizer directly.</p>
        </div>

        ${event.description ? `
        <div style="margin-bottom:24px;">
          <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 6px;">Event description</p>
          <p style="font-size:14px;color:#6b7280;margin:0;white-space:pre-line;">${event.description.slice(0, 400)}${event.description.length > 400 ? '…' : ''}</p>
        </div>` : ''}

        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Actions</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          <a href="${previewUrl}" style="${btnStyle}background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">
            👁 Preview event
          </a>
          <a href="${adminUrl}" style="${btnStyle}background:#635BFF;color:#fff;">
            ✓ Review &amp; approve / reject
          </a>
        </div>

        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px;">
          To approve or reject, click "Review &amp; approve / reject" above — the event will appear at the top of your pending list.<br/>
          To ask the organizer a question, simply reply to this email — your reply goes directly to <strong>${organizer?.email ?? 'the organizer'}</strong>.
        </p>
      </body>
      </html>
    `,
  })

  res.json({ ok: true })
}
