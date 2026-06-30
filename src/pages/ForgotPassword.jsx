import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from '../components/TikloLogo'
import Footer from '../components/Footer'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const lp = useLangPath()
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
          <Link to={lp('/login')} className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-4">
            {t('forgotPassword.backToSignIn')}
          </Link>
        </div>
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <Link to={lp('/')} className="block mb-6"><TikloLogo size={28} /></Link>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{t('forgotPassword.title')}</h1>
          <p className="text-muted text-sm mb-6">{t('forgotPassword.subtitle')}</p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm text-center">
              {t('forgotPassword.sentTo')} <strong>{email}</strong>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className="block text-sm text-muted mb-1">{t('forgotPassword.emailLabel')}</label>
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
                {loading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
              </button>
            </form>
          )}

          <p className="text-center text-muted text-sm mt-6">
            {t('forgotPassword.remember')}{' '}
            <Link to={lp('/login')} className="text-primary hover:underline">{t('forgotPassword.signIn')}</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
