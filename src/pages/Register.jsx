import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email, password, fullName)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Link to="/" className="fixed top-5 left-5 font-heading text-xl font-bold text-primary hover:opacity-80 transition">Tiklo</Link>
        <div className="w-full max-w-sm bg-surface rounded-2xl p-8 text-center">
          <h2 className="font-heading text-2xl font-bold text-slate-100 mb-2">Check your email</h2>
          <p className="text-muted text-sm">We sent a confirmation link to <span className="text-slate-100">{email}</span>. Once confirmed, an admin will approve your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Link to="/" className="fixed top-5 left-5 font-heading text-xl font-bold text-primary hover:opacity-80 transition">Tiklo</Link>
      <div className="w-full max-w-sm bg-surface rounded-2xl p-8 shadow-xl">
        <h1 className="font-heading text-3xl font-bold text-slate-100 mb-1">Create account</h1>
        <p className="text-muted text-sm mb-6">Start selling tickets on Tiklo</p>
        {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Full name</label>
            <input
              type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full bg-bg border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-bg border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Password</label>
            <input
              type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-bg border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-muted text-sm mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
