import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify JWT and admin role
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
      // Cascade in FK order: tickets → orders → ticket_types → event
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
