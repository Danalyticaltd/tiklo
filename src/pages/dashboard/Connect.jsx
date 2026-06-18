import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, ExternalLink, Loader } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function Connect() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success') === '1'
  const [loading, setLoading] = useState(false)
  const [onboarded, setOnboarded] = useState(profile?.stripe_onboarded ?? false)

  // If returning from Stripe, check if onboarding completed
  useEffect(() => {
    if (!success || !user) return
    async function checkOnboarded() {
      const { data } = await supabase
        .from('profiles')
        .select('stripe_onboarded, stripe_account_id')
        .eq('id', user.id)
        .single()
      if (data?.stripe_onboarded) setOnboarded(true)
    }
    checkOnboarded()
  }, [success, user])

  async function startOnboarding() {
    setLoading(true)
    try {
      const res = await fetch('/api/create-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          return_url: `${window.location.origin}/dashboard/connect?success=1`,
          refresh_url: `${window.location.origin}/dashboard/connect`,
        }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {onboarded ? (
          <>
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h1 className="font-heading text-3xl font-bold text-slate-100 mb-2">Stripe connected!</h1>
            <p className="text-muted mb-8">You're all set to receive payouts. Create and publish events to start selling tickets.</p>
            <Link to="/dashboard"><Button>Go to dashboard</Button></Link>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">💳</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-slate-100 mb-3">Connect your bank</h1>
            <p className="text-muted mb-2">Tiklo uses Stripe to pay you directly after every event.</p>
            <p className="text-muted text-sm mb-8">Setup takes about 5 minutes. You'll need your bank account details and ID.</p>

            <div className="bg-surface rounded-2xl p-6 text-left mb-8 space-y-3">
              {['Get paid within 2 business days', 'Tiklo fee: 2.5% + $0.99 per ticket', 'Free events have no platform fee', 'Manage payouts in your Stripe dashboard'].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm text-muted">
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Button onClick={startOnboarding} disabled={loading} size="lg" className="w-full">
              {loading ? <><Loader size={16} className="inline animate-spin mr-2" />Redirecting to Stripe…</> : <>Connect with Stripe <ExternalLink size={14} className="inline ml-1.5" /></>}
            </Button>
            <Link to="/dashboard" className="inline-block mt-4 text-muted text-sm hover:text-slate-100 transition">Skip for now</Link>
          </>
        )}
      </div>
    </div>
  )
}
