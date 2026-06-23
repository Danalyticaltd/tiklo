import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TikloLogo from '../components/TikloLogo'
import Footer from '../components/Footer'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-sm">
          <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-4">
            ← Back to sign in
          </Link>
        </div>
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <Link to="/" className="block mb-6"><TikloLogo size={28} /></Link>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
          <p className="text-muted text-sm mb-6">Enter your email and we'll send you a reset link.</p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm text-center">
              ✓ Check your inbox — a reset link is on its way to <strong>{email}</strong>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className="block text-sm text-muted mb-1">Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-center text-muted text-sm mt-6">
            Remember it? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
