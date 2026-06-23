import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
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

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return res.status(400).json({ error: 'No Stripe account found for this user' })
    }

    // Retrieve the account from Stripe to check onboarding status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    const onboarded = !!(
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    )

    await supabase
      .from('profiles')
      .update({ stripe_onboarded: onboarded })
      .eq('id', user.id)

    res.json({ onboarded, account_id: profile.stripe_account_id })
  } catch (err) {
    console.error('connect-callback error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
