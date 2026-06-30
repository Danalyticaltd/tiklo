import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from '../components/TikloLogo'
import Footer from '../components/Footer'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lp = useLangPath()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError(t('resetPassword.errorMismatch')); return }
    if (password.length < 8) { setError(t('resetPassword.errorTooShort')); return }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(
        err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid')
          ? t('resetPassword.errorExpired')
          : err.message
      )
      return
    }
    setDone(true)
    setTimeout(() => navigate(lp('/dashboard')), 2500)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-sm">
          <Link to={lp('/')} className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition mb-4">
            {t('resetPassword.back')}
          </Link>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <Link to={lp('/')} className="block mb-6"><TikloLogo size={28} /></Link>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{t('resetPassword.title')}</h1>
          <p className="text-muted text-sm mb-6">{t('resetPassword.subtitle')}</p>

          {done ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm text-center">
              {t('resetPassword.done')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">
                  {error}
                  {error === t('resetPassword.errorExpired') && (
                    <p className="mt-1">
                      <Link to={lp('/forgot-password')} className="text-primary hover:underline">{t('resetPassword.requestNew')}</Link>
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm text-muted mb-1">{t('resetPassword.newPassword')}</label>
                <input
                  type="password" required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('resetPassword.passwordPlaceholder')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">{t('resetPassword.confirmPassword')}</label>
                <input
                  type="password" required minLength={8} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={t('resetPassword.confirmPlaceholder')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-[#574BFF] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? t('resetPassword.updating') : t('resetPassword.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
