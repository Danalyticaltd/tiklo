import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, User, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLangPath } from '../hooks/useLangPath'
import TikloLogo from '../components/TikloLogo'

export default function Onboarding() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lp = useLangPath()
  const [step, setStep] = useState(0)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name ?? '')
      setAvatarPreview(profile.avatar_url ?? null)
    }
  }, [profile])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    setError(null)
    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url ?? null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop().toLowerCase()
        const allowed = ['jpg', 'jpeg', 'png', 'webp']
        if (!allowed.includes(ext)) throw new Error(`Unsupported format. Use JPG, PNG, or WebP.`)
        if (avatarFile.size > 2 * 1024 * 1024) throw new Error('Image must be under 2 MB.')
        const path = `avatars/${user.id}.${ext}`
        const { error: upErr } = await supabase.storage.from('banners').upload(path, avatarFile, { upsert: true })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ full_name: displayName, bio, avatar_url })
        .eq('id', user.id)
      if (updateErr) throw new Error(updateErr.message)

      if (typeof fetchProfile === 'function') await fetchProfile(user.id)
      setStep(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const STEPS = [t('onboarding.step0'), t('onboarding.step1'), t('onboarding.step2')]

  const HOW_IT_WORKS = [
    { icon: '📝', title: t('onboarding.h1Title'), desc: t('onboarding.h1Desc') },
    { icon: '✅', title: t('onboarding.h2Title'), desc: t('onboarding.h2Desc') },
    { icon: '🎟️', title: t('onboarding.h3Title'), desc: t('onboarding.h3Desc') },
    { icon: '💰', title: t('onboarding.h4Title'), desc: t('onboarding.h4Desc') },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><TikloLogo size={28} /></div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all
                ${i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? 'text-gray-900 font-medium' : 'text-muted'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">

          {step === 0 && (
            <>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{t('onboarding.profileTitle')}</h1>
              <p className="text-muted text-sm mb-6">{t('onboarding.profileSubtitle')}</p>

              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex flex-col items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary transition bg-gray-50 flex items-center justify-center"
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    : <User size={28} className="text-gray-300" />
                  }
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full">
                    <Upload size={14} className="text-white" />
                  </div>
                </button>
                <p className="text-xs text-muted">{t('onboarding.uploadLogo')}</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">{t('onboarding.displayName')} <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name or organisation name"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">{t('onboarding.descLabel')} <span className="text-gray-400 text-xs">{t('onboarding.descOptional')}</span></label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder={t('onboarding.bioPlaceholder')}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
                  />
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving || !displayName.trim()}
                className="w-full mt-6 bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? t('onboarding.saving') : t('onboarding.continue')}
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{t('onboarding.howTitle')}</h1>
              <p className="text-muted text-sm mb-6">{t('onboarding.howSubtitle')}</p>

              <div className="space-y-4 mb-8">
                {HOW_IT_WORKS.map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-muted text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {t('onboarding.gotIt')}
              </button>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">{t('onboarding.readyTitle')}</h1>
              <p className="text-muted text-sm mb-8 leading-relaxed">{t('onboarding.readyDesc')}</p>
              <button
                onClick={() => navigate(lp('/dashboard/events/new'))}
                className="w-full bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition mb-3"
              >
                {t('onboarding.createFirst')}
              </button>
              <button
                onClick={() => navigate(lp('/dashboard'))}
                className="w-full text-sm text-muted hover:text-gray-900 transition"
              >
                {t('onboarding.goDashboard')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
