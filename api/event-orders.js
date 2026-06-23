import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const eventId = req.query.event_id
  if (!eventId) return res.status(400).json({ error: 'event_id required' })

  // Verify caller owns the event
  const { data: ev } = await supabase.from('events').select('organizer_id').eq('id', eventId).single()
  if (!ev || ev.organizer_id !== user.id) return res.status(403).json({ error: 'Forbidden' })

  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200)
  const offset = parseInt(req.query.offset ?? '0', 10)

  const { data: orders, count, error } = await supabase
    .from('orders')
    .select('*, ticket_types(name)', { count: 'exact' })
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[event-orders]', error)
    return res.status(500).json({ error: 'Internal server error' })
  }

  res.json({ orders, count })
}
