import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'

export default function Connect() {
  const [searchParams] = useSearchParams()
  const { fetchProfile } = useAuth()
  const [status, setStatus] = useState('idle') // idle | verifying | success | error | already
  const [message, setMessage] = useState('')

  useEffect(() => {
    const success = searchParams.get('success')
    if (success !== '1') return

    async function verify() {
      setStatus('verifying')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) { setStatus('error'); setMessage('Session expired — please log in again.'); return }

        const res = await fetch('/api/connect-callback', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!res.ok) { setStatus('error'); setMessage(json.error ?? 'Verification failed'); return }

        if (json.onboarded) {
          await fetchProfile()
          setStatus('success')
        } else {
          setStatus('error')
          setMessage('Stripe onboarding is not yet complete. Please finish all required steps.')
        }
      } catch (err) {
        setStatus('error')
        setMessage('Something went wrong verifying your account.')
      }
    }

    verify()
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        {status === 'verifying' && (
          <>
            <Loader size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Verifying your Stripe account…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">You're connected!</h1>
            <p className="text-muted mb-6">Your Stripe account is verified. You can now publish events and receive payouts.</p>
            <Link to="/dashboard" className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-muted mb-6">{message}</p>
            <Link to="/dashboard/profile" className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Try again
            </Link>
          </>
        )}

        {status === 'idle' && (
          // Landed here without ?success=1 — just redirect to profile
          <div className="text-muted">
            <p>Redirecting…</p>
            <meta httpEquiv="refresh" content="0;url=/dashboard/profile" />
          </div>
        )}
      </div>
    </div>
  )
}
