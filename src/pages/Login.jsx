import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'
import TikloLogo from '../components/TikloLogo'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
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
          <h1 className="font-heading text-3xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-muted text-sm mb-6">Organizer portal</p>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-muted text-sm mt-4">
            <Link to="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link>
          </p>
          <p className="text-center text-muted text-sm mt-3">
            No account? <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
