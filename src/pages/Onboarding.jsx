import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, User, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TikloLogo from '../components/TikloLogo'

const STEPS = ['Your profile', 'How it works', "You're ready"]

export default function Onboarding() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Step 1 state
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

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8"><TikloLogo size={28} /></div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all
                ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? 'text-gray-900 font-medium' : 'text-muted'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">

          {/* ── Step 0: Profile ── */}
          {step === 0 && (
            <>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Set up your profile</h1>
              <p className="text-muted text-sm mb-6">This is what attendees will see on your events.</p>

              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {/* Avatar */}
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
                <p className="text-xs text-muted">Upload logo (optional)</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Display name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name or organisation name"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Short description <span className="text-gray-400 text-xs">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell attendees who you are and what kind of events you organise..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
                  />
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving || !displayName.trim()}
                className="w-full mt-6 bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </>
          )}

          {/* ── Step 1: How it works ── */}
          {step === 1 && (
            <>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">How Tiklo works</h1>
              <p className="text-muted text-sm mb-6">Here's what happens next.</p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: '📝', title: 'Create your event', desc: 'Add your event details, upload a flyer, and set ticket types and prices.' },
                  { icon: '✅', title: 'Submit for approval', desc: 'Our team reviews your event to ensure quality. Usually within 24 hours.' },
                  { icon: '🎟️', title: 'Start selling', desc: 'Once approved, your event goes live and attendees can buy tickets instantly.' },
                  { icon: '💰', title: 'Get paid', desc: 'After your event, Tiklo sends your payout via Interac or bank transfer. No setup needed.' },
                ].map(({ icon, title, desc }) => (
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
                Got it
              </button>
            </>
          )}

          {/* ── Step 2: Ready ── */}
          {step === 2 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                Your account is ready. Create your first event and start selling tickets.
              </p>
              <button
                onClick={() => navigate('/dashboard/events/new')}
                className="w-full bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition mb-3"
              >
                Create my first event
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-sm text-muted hover:text-gray-900 transition"
              >
                Go to dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
