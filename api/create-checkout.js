import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Fee structure: 2.5% + $0.99 per ticket
function calcFee(price, quantity) {
  if (price === 0) return 0
  const subtotal = price * quantity
  return Math.round(subtotal * 0.025 * 100 + 99 * quantity) // in cents
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event_id, ticket_type_id, quantity, buyer_name, buyer_email } = req.body

  try {
    // Fetch event + ticket type + organizer
    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('*, events(organizer_id, title, profiles(stripe_account_id, stripe_onboarded))')
      .eq('id', ticket_type_id)
      .single()

    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' })

    const available = ticketType.quantity - ticketType.quantity_sold
    if (available < quantity) return res.status(400).json({ error: 'Not enough tickets available' })

    const organizer = ticketType.events?.profiles
    const unitAmount = Math.round(ticketType.price * 100) // cents

    // Create order record (pending)
    const subtotal = ticketType.price * quantity
    const platformFeeCents = calcFee(ticketType.price, quantity)

    const { data: order } = await supabase.from('orders').insert({
      event_id,
      ticket_type_id,
      buyer_email,
      buyer_name,
      quantity,
      subtotal,
      platform_fee: platformFeeCents / 100,
      status: 'pending',
    }).select().single()

    // Free tickets — no Stripe needed
    if (unitAmount === 0) {
      return res.json({ free: true, order_id: order.id })
    }

    // Build PaymentIntent options
    const intentOptions = {
      amount: unitAmount * quantity,
      currency: 'cad',
      metadata: { order_id: order.id, buyer_name, buyer_email },
    }

    // Only add application_fee if organizer has a connected Stripe account
    if (organizer?.stripe_account_id && organizer?.stripe_onboarded) {
      intentOptions.application_fee_amount = platformFeeCents
      intentOptions.transfer_data = { destination: organizer.stripe_account_id }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentOptions)

    // Save payment intent ID to order
    await supabase.from('orders').update({
      stripe_payment_intent: paymentIntent.id,
    }).eq('id', order.id)

    res.json({ client_secret: paymentIntent.client_secret, order_id: order.id })
  } catch (err) {
    console.error('create-checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
