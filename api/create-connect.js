import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { user_id, return_url, refresh_url } = req.body

  try {
    // Fetch or create Stripe Express account for this organizer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user_id)
      .single()

    let accountId = profile?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' })
      accountId = account.id
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user_id)
    }

    // Generate one-time onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url ?? `${process.env.VITE_APP_URL}/dashboard/connect`,
      return_url: return_url ?? `${process.env.VITE_APP_URL}/dashboard/connect?success=1`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url })
  } catch (err) {
    console.error('create-connect error:', err)
    res.status(500).json({ error: err.message })
  }
}
