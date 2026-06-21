import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const navigate = useNavigate()
  const [digits, setDigits] = useState(Array(8).fill(''))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendMsg, setResendMsg] = useState(null)
  const inputRefs = useRef([])

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (digits.every(d => d !== '')) {
      handleVerify(digits.join(''))
    }
  }, [digits])

  function handleChange(index, value) {
    // Handle paste of full code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6)
      const next = Array(6).fill('')
      pasted.split('').forEach((c, i) => { next[i] = c })
      setDigits(next)
      inputRefs.current[Math.min(pasted.length, 5)]?.focus()
      return
    }
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(token) {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
      if (error) throw error
      navigate('/onboarding')
    } catch (err) {
      const msg = err.message ?? ''
      setError(msg.toLowerCase().includes('expired')
        ? 'Code expired. Request a new one below.'
        : 'Invalid code. Please check and try again.')
      setDigits(Array(6).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResendMsg(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setResendMsg('New code sent — check your email.')
      setCooldown(60)
      const t = setInterval(() => setCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0 }
        return c - 1
      }), 1000)
    } catch (err) {
      setError('Could not resend: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-heading font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent block mb-8">Tiklo</Link>
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-2xl">📬</div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
          <p className="text-muted text-sm mb-6">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-800">{email}</span>
          </p>

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {resendMsg && <p className="text-green-600 text-sm mb-4 bg-green-50 rounded-lg px-3 py-2">{resendMsg}</p>}

          {/* 6-digit boxes */}
          <div className="flex gap-2 justify-center mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                autoFocus={i === 0}
                disabled={loading}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border outline-none transition
                  ${d ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-900'}
                  focus:border-primary disabled:opacity-50`}
              />
            ))}
          </div>

          {loading && (
            <p className="text-center text-muted text-sm mb-4">Verifying...</p>
          )}

          <p className="text-center text-sm text-muted">
            Didn't receive a code?{' '}
            {cooldown > 0
              ? <span className="text-gray-400">Resend in {cooldown}s</span>
              : <button onClick={handleResend} className="text-primary hover:underline font-medium">Resend code</button>
            }
          </p>
          <p className="text-center mt-3">
            <Link to="/register" className="text-xs text-muted hover:text-gray-700 transition">← Back to register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
