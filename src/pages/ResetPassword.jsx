import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TikloLogo from '../components/TikloLogo'
import Footer from '../components/Footer'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      // Token expired / already used
      setError(
        err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid')
          ? 'This reset link has expired or already been used. Request a new one from your profile settings.'
          : err.message
      )
      return
    }
    setDone(true)
    setTimeout(() => navigate('/dashboard'), 2500)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-4">
            ← Back to events
          </Link>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <Link to="/" className="block mb-6"><TikloLogo size={28} /></Link>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
          <p className="text-muted text-sm mb-6">Choose a strong password for your Tiklo account.</p>

          {done ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm text-center">
              ✓ Password updated! Redirecting to your dashboard…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">
                  {error}
                  {error.includes('expired') && (
                    <p className="mt-1">
                      <Link to="/dashboard/profile" className="text-primary hover:underline">Request a new link →</Link>
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm text-muted mb-1">New password</label>
                <input
                  type="password" required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Confirm password</label>
                <input
                  type="password" required minLength={8} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
