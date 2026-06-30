import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from '../components/TikloLogo'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lp = useLangPath()
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendMsg, setResendMsg] = useState(null)
  const inputRefs = useRef([])

  useEffect(() => {
    if (digits.every(d => d !== '')) {
      handleVerify(digits.join(''))
    }
  }, [digits])

  function handleChange(index, value) {
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
      navigate(lp('/onboarding'))
    } catch (err) {
      const msg = err.message ?? ''
      setError(msg.toLowerCase().includes('expired')
        ? t('verify.errorExpired')
        : t('verify.errorInvalid'))
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
      setResendMsg(t('verify.resendSuccess'))
      setCooldown(60)
      const timer = setInterval(() => setCooldown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      }), 1000)
    } catch (err) {
      setError(t('verify.resendError', { msg: err.message }))
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to={lp('/')} className="block mb-8"><TikloLogo size={28} /></Link>
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-2xl">📬</div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{t('verify.title')}</h1>
          <p className="text-muted text-sm mb-6">
            {t('verify.subtitle')}{' '}
            <span className="font-medium text-gray-800">{email}</span>
          </p>

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {resendMsg && <p className="text-green-600 text-sm mb-4 bg-green-50 rounded-lg px-3 py-2">{resendMsg}</p>}

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
            <p className="text-center text-muted text-sm mb-4">{t('verify.verifying')}</p>
          )}

          <p className="text-center text-sm text-muted">
            {t('verify.noCode')}{' '}
            {cooldown > 0
              ? <span className="text-gray-400">{t('verify.resendIn', { s: cooldown })}</span>
              : <button onClick={handleResend} className="text-primary hover:underline font-medium">{t('verify.resend')}</button>
            }
          </p>
          <p className="text-center mt-3">
            <Link to={lp('/register')} className="text-xs text-muted hover:text-gray-700 transition">{t('verify.back')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
