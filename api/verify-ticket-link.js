import { createClient } from '@supabase/supabase-js'
import { check, getIp } from './_lib/rateLimit.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIp(req)
  const { allowed } = check(`verify-link:${ip}`, 10, 15 * 60_000)
  if (!allowed) return res.status(429).json({ error: 'Too many requests.' })

  const { token } = req.body ?? {}
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token required.' })

  const { data: link, error } = await supabase
    .from('ticket_magic_links')
    .select('email, expires_at, used_at')
    .eq('token', token)
    .single()

  if (error || !link) return res.status(401).json({ error: 'Invalid or expired link.' })
  if (link.used_at) return res.status(401).json({ error: 'This link has already been used. Request a new one.' })
  if (new Date(link.expires_at) < new Date()) return res.status(401).json({ error: 'This link has expired. Request a new one.' })

  // Mark as used immediately (one-time use)
  await supabase
    .from('ticket_magic_links')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  res.json({ ok: true, email: link.email })
}
