import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, User, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLangPath } from '../../hooks/useLangPath'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        {children}
      </div>
    </div>
  )
}

export default function OrgProfile() {
  const { user, profile, fetchProfile } = useAuth()
  const { t } = useTranslation()
  const lp = useLangPath()
  const fileRef = useRef(null)
  const [payouts, setPayouts] = useState([])

  useEffect(() => {
    if (!user) return
    // First get this organizer's event IDs, then fetch their paid orders
    supabase.from('events').select('id, title, event_date').eq('organizer_id', user.id)
      .then(({ data: events }) => {
        if (!events?.length) return
        const ids = events.map(e => e.id)
        const eventMap = Object.fromEntries(events.map(e => [e.id, e]))
        supabase.from('orders')
          .select('subtotal, platform_fee, quantity, event_id')
          .in('event_id', ids)
          .eq('status', 'paid')
          .then(({ data: orders }) => {
            if (!orders) return
            const byEvent = {}
            orders.forEach(o => {
              const ev = eventMap[o.event_id]
              if (!ev) return
              if (!byEvent[o.event_id]) byEvent[o.event_id] = { title: ev.title, date: ev.event_date, revenue: 0, fee: 0, tickets: 0 }
              byEvent[o.event_id].revenue += Number(o.subtotal ?? 0)
              byEvent[o.event_id].fee += Number(o.platform_fee ?? 0)
              byEvent[o.event_id].tickets += o.quantity ?? 0
            })
            setPayouts(Object.values(byEvent).sort((a, b) => new Date(b.date) - new Date(a.date)))
          })
      })
  }, [user])

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  // Payout fields
  const [method, setMethod] = useState('interac')
  const [details, setDetails] = useState('')
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState(null)

  // Notification prefs
  const [notifSales, setNotifSales] = useState(true)
  const [notifReminders, setNotifReminders] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMsg, setNotifMsg] = useState(null)

  // Security
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.full_name ?? '')
    setBio(profile.bio ?? '')
    setAvatarPreview(profile.avatar_url ?? null)
    setMethod(profile.payment_method ?? 'interac')
    // Support both legacy pipe format and new JSON format
    const raw = profile.payment_details ?? ''
    if (profile.payment_method === 'bank_transfer' && raw && !raw.startsWith('{')) {
      // Migrate legacy pipe format to JSON on first load
      const parts = raw.split('|')
      setDetails(JSON.stringify({ bank: parts[0] ?? '', institution: parts[1] ?? '', transit: parts[2] ?? '', account: parts[3] ?? '' }))
    } else {
      setDetails(raw)
    }
    const prefs = profile.notification_prefs ?? {}
    setNotifSales(prefs.sales !== false)
    setNotifReminders(prefs.reminders !== false)
  }, [profile])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      let avatar_url = profile?.avatar_url ?? null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop().toLowerCase()
        if (!['jpg','jpeg','png','webp'].includes(ext)) throw new Error(`Unsupported format ".${ext}". Use JPG, PNG, or WebP.`)
        if (avatarFile.size > 2 * 1024 * 1024) throw new Error('Image must be under 2 MB.')
        const path = `avatars/${user.id}.${ext}`
        const { error: upErr } = await supabase.storage.from('banners').upload(path, avatarFile, { upsert: true })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }
      const { error } = await supabase.from('profiles').update({ full_name: displayName, bio, avatar_url }).eq('id', user.id)
      if (error) throw error
      if (typeof fetchProfile === 'function') await fetchProfile(user.id)
      setProfileMsg({ ok: true, text: t('orgProfile.profileSaved') })
    } catch (err) {
      setProfileMsg({ ok: false, text: err.message })
    } finally {
      setProfileSaving(false)
    }
  }

  async function savePayout() {
    setPayoutMsg(null)
    setPayoutSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ payment_method: method, payment_details: details }).eq('id', user.id)
      if (error) throw error
      if (typeof fetchProfile === 'function') await fetchProfile(user.id)
      setPayoutMsg({ ok: true, text: t('orgProfile.payoutSaved') })
    } catch (err) {
      setPayoutMsg({ ok: false, text: err.message })
    } finally {
      setPayoutSaving(false)
    }
  }

  async function saveNotifs() {
    setNotifMsg(null)
    setNotifSaving(true)
    try {
      const { error } = await supabase.from('profiles')
        .update({ notification_prefs: { sales: notifSales, reminders: notifReminders } })
        .eq('id', user.id)
      if (error) throw error
      if (typeof fetchProfile === 'function') await fetchProfile(user.id)
      setNotifMsg({ ok: true, text: t('orgProfile.prefsSaved') })
    } catch (err) {
      setNotifMsg({ ok: false, text: err.message })
    } finally {
      setNotifSaving(false)
    }
  }

  async function sendPasswordReset() {
    setResetLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` })
    setResetLoading(false)
    if (err) { alert('Could not send reset email: ' + err.message); return }
    setResetSent(true)
  }

  function Msg({ msg }) {
    if (!msg) return null
    return (
      <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${msg.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
        {msg.ok && <CheckCircle size={14} />}{msg.text}
      </div>
    )
  }

  function Toggle({ label, description, checked, onChange }) {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5 shrink-0">
          <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
          <div className={`w-10 h-6 rounded-full transition ${checked ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-navy">{label}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </label>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <Link to={lp('/dashboard')} className="inline-flex items-center gap-1.5 text-muted hover:text-gray-900 text-sm mb-4 transition">
            <ArrowLeft size={14} /> {t('orgProfile.back')}
          </Link>
          <h1 className="font-heading text-3xl font-bold text-navy">{t('orgProfile.title')}</h1>
        </div>

        {/* ── 1. Organiser profile ── */}
        <Section title={t('orgProfile.orgProfileTitle')} subtitle={t('orgProfile.orgProfileSub')}>
          <Msg msg={profileMsg} />
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary transition bg-gray-50 flex items-center justify-center"
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                : <User size={32} className="text-gray-300" />
              }
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full">
                <Upload size={16} className="text-white" />
              </div>
            </button>
            <p className="text-xs text-muted">{t('orgProfile.uploadHint')}</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">{t('orgProfile.displayName')}</label>
            <input
              type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder={t('orgProfile.displayNamePlaceholder')}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">{t('orgProfile.shortDesc')}</label>
            <textarea
              rows={3} value={bio} onChange={e => setBio(e.target.value)}
              placeholder={t('orgProfile.shortDescPlaceholder')}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={profileSaving}>{profileSaving ? t('orgProfile.saving') : t('orgProfile.saveProfile')}</Button>
          </div>
        </Section>

        {/* ── 2. Payout info ── */}
        <Section title={t('orgProfile.payoutTitle')} subtitle={t('orgProfile.payoutSub')}>
          <Msg msg={payoutMsg} />
          <div>
            <label className="block text-sm text-muted mb-3">{t('orgProfile.preferredMethod')}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'interac', label: t('orgProfile.interac'), emoji: '⚡' },
                { value: 'bank_transfer', label: t('orgProfile.bankTransfer'), emoji: '🏦' },
              ].map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => { setMethod(opt.value); setDetails('') }}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition text-sm font-medium
                    ${method === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span className="text-2xl">{opt.emoji}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'interac' && (
            <div>
              <label className="block text-sm text-muted mb-1">{t('orgProfile.interacEmail')}</label>
              <input
                type="email" value={details} onChange={e => setDetails(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
              <p className="text-xs text-muted mt-1.5">{t('orgProfile.interacHint')}</p>
            </div>
          )}

          {method === 'bank_transfer' && (() => {
            let bd = { bank: '', institution: '', transit: '', account: '' }
            try { bd = { ...bd, ...JSON.parse(details || '{}') } } catch {}
            const setField = (key, val) => setDetails(JSON.stringify({ ...bd, [key]: val }))
            return (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted mb-1">{t('orgProfile.bankName')}</label>
                <input type="text" value={bd.bank}
                  onChange={e => setField('bank', e.target.value)}
                  placeholder={t('orgProfile.bankNamePlaceholder')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('orgProfile.institution'), hint: '3 digits', key: 'institution', max: 3, ph: '000' },
                  { label: t('orgProfile.transit'), hint: '5 digits', key: 'transit', max: 5, ph: '00000' },
                  { label: t('orgProfile.accountNumber'), hint: '', key: 'account', max: 12, ph: '0000000' },
                ].map(({ label, hint, key, max, ph }) => (
                  <div key={key}>
                    <label className="block text-sm text-muted mb-1">{label} {hint && <span className="text-gray-400 text-xs">({hint})</span>}</label>
                    <input type="text" inputMode="numeric" maxLength={max} value={bd[key]}
                      onChange={e => setField(key, e.target.value.replace(/\D/g, ''))}
                      placeholder={ph}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">{t('orgProfile.bankingSecure')}</p>
            </div>
            )
          })()}

          <div className="bg-surface rounded-xl p-4 text-xs text-muted leading-relaxed">
            {t('orgProfile.payoutNote')}
          </div>

          <div className="flex justify-end">
            <Button onClick={savePayout} disabled={payoutSaving || !details.trim()}>{payoutSaving ? t('orgProfile.saving') : t('orgProfile.savePayout')}</Button>
          </div>
        </Section>

        {/* ── 3. Notification preferences ── */}
        <Section title={t('orgProfile.notifTitle')} subtitle={t('orgProfile.notifSub')}>
          <Msg msg={notifMsg} />
          <Toggle
            label={t('orgProfile.salesLabel')}
            description={t('orgProfile.salesDesc')}
            checked={notifSales}
            onChange={setNotifSales}
          />
          <Toggle
            label={t('orgProfile.remindersLabel')}
            description={t('orgProfile.remindersDesc')}
            checked={notifReminders}
            onChange={setNotifReminders}
          />
          <div className="flex justify-end">
            <Button onClick={saveNotifs} disabled={notifSaving}>{notifSaving ? t('orgProfile.saving') : t('orgProfile.savePrefs')}</Button>
          </div>
        </Section>

        {/* ── 4. Payout history ── */}
        <Section title={t('orgProfile.payoutHistTitle')} subtitle={t('orgProfile.payoutHistSub')}>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">{t('orgProfile.noSales')}</p>
          ) : (
            <div className="divide-y divide-[#E3E8EE]">
              {payouts.map((p) => (
                <div key={p.title + p.date} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{p.title}</p>
                    <p className="text-xs text-muted">{new Date(p.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} · {t('orgProfile.ticket', { count: p.tickets })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">${(p.revenue - p.fee).toFixed(2)}</p>
                    <p className="text-[10px] text-muted">{t('orgProfile.afterFee', { fee: p.fee.toFixed(2) })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── 5. Security ── */}
        <Section title={t('orgProfile.securityTitle')}>
          <div>
            <label className="block text-sm text-muted mb-1">{t('orgProfile.emailLabel')}</label>
            <p className="text-sm font-medium text-navy bg-surface rounded-lg px-4 py-2.5 border border-gray-200">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">{t('orgProfile.passwordLabel')}</label>
            {resetSent ? (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={14} /> {t('orgProfile.resetSent')}
              </div>
            ) : (
              <button
                onClick={sendPasswordReset}
                disabled={resetLoading}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {resetLoading ? t('orgProfile.sending') : t('orgProfile.sendReset')}
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
