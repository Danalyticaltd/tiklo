import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { orderId } = req.body
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, payment_intent_id, subtotal, buyer_name, event_id, quantity, ticket_type_id')
    .eq('id', orderId)
    .single()

  if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'paid') return res.status(400).json({ error: `Order is already ${order.status}` })
  if (!order.payment_intent_id) return res.status(400).json({ error: 'No payment recorded for this order — may have been a free ticket' })

  try {
    await stripe.refunds.create({ payment_intent: order.payment_intent_id })

    await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)

    // Return sold count
    await supabase.rpc('decrement_quantity_sold', {
      p_ticket_type_id: order.ticket_type_id,
      p_qty: order.quantity,
    }).maybeSingle()

    res.json({ ok: true })
  } catch (err) {
    console.error('[refund]', err)
    res.status(500).json({ error: err.message })
  }
}
