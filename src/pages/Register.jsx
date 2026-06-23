import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TikloLogo from '../components/TikloLogo'
import Footer from '../components/Footer'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email, password, fullName)
      navigate(`/verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      const msg = err.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        try {
          await supabase.auth.resend({ type: 'signup', email })
          navigate(`/verify?email=${encodeURIComponent(email)}`)
        } catch {
          setError('An account with this email already exists. Try signing in instead.')
        }
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
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
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-muted text-sm mb-6">Start selling tickets on Tiklo</p>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Full name</label>
              <input
                type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your name or organisation"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Password</label>
              <input
                type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Continue'}
            </button>
          </form>
          <p className="text-center text-muted text-sm mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
