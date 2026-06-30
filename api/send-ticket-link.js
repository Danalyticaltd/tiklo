import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { check, getIp } from './_lib/rateLimit.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://tiklo.ca'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIp(req)
  const { allowed } = check(`ticket-link:${ip}`, 5, 15 * 60_000)
  if (!allowed) return res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' })

  const { email } = req.body ?? {}
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required.' })

  const normalised = email.toLowerCase().trim()

  // Check the email actually has paid orders — don't reveal whether it does or not
  // in the response (always say "if we found tickets, we sent a link")
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_email', normalised)
    .eq('status', 'paid')
    .limit(1)

  if (orders?.length) {
    // Generate a secure one-time token
    const { data: link, error } = await supabase
      .from('ticket_magic_links')
      .insert({ email: normalised })
      .select('token')
      .single()

    if (!error && link) {
      const url = `${APP_URL}/my-tickets?token=${link.token}`

      await resend.emails.send({
        from: 'Tiklo <tickets@tiklo.ca>',
        to: normalised,
        subject: 'Your Tiklo ticket link',
        html: `<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
  <div style="display:table;margin-bottom:24px;">
    <img src="https://tiklo.ca/favicon.svg" width="36" height="36" alt="" style="display:table-cell;vertical-align:middle;border-radius:10px;" />
    <span style="display:table-cell;vertical-align:middle;padding-left:8px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Tikl<span style="color:#635BFF;">o</span></span>
  </div>

  <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Here are your tickets</h2>
  <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">Click the button below to view and download your tickets. This link is valid for <strong>1 hour</strong> and can only be used once.</p>

  <a href="${url}" style="display:inline-block;padding:14px 28px;background:#635BFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
    View my tickets →
  </a>

  <p style="color:#9ca3af;font-size:12px;margin-top:28px;border-top:1px solid #f3f4f6;padding-top:16px;">
    If you didn't request this email, you can ignore it — no action needed.<br/>
    This link expires at ${new Date(Date.now() + 60 * 60_000).toUTCString()}.
  </p>
</body>
</html>`,
      })
    }
  }

  // Always return the same response — don't leak whether the email exists
  res.json({ ok: true })
}
