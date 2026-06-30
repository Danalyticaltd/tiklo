import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, ArrowLeft, Upload, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLangPath } from '../../hooks/useLangPath'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import CommunityInput from '../../components/CommunityInput'

const TAGS = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']
const EVENT_TYPES = ['Cultural show', 'Community event', 'Concert', 'Meetup', 'Workshop', 'Conference', 'Festival', 'Fundraiser', 'Seminar', 'Sport Event', 'Networking', 'Other']
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function EditEvent() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lp = useLangPath()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [existingBanner, setExistingBanner] = useState(null)
  const [error, setError] = useState(null)
  const [savedTTs, setSavedTTs] = useState([])
  const [eventStatus, setEventStatus] = useState(null)

  const locationInputRef = useRef(null)

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm({
    mode: 'onChange',
    shouldFocusError: true,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticket_types' })
  const isOnline = watch('is_online')

  // Load existing event + ticket types
  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: tts }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('ticket_types').select('*').eq('event_id', id).order('created_at'),
      ])
      if (!ev || ev.organizer_id !== user.id) { navigate(lp('/dashboard')); return }
      setExistingBanner(ev.banner_url ?? null)
      setEventStatus(ev.status)
      setSavedTTs(tts ?? [])
      reset({
        title: ev.title,
        description: ev.description ?? '',
        is_online: ev.is_online ?? false,
        location: ev.location ?? '',
        city: ev.city ?? '',
        community_tag: ev.community_tag,
        event_type: ev.event_type ?? 'Cultural show',
        event_date: ev.event_date ? ev.event_date.slice(0, 16) : '',
        ticket_types: (tts ?? []).map(tt => ({
          id: tt.id,
          name: tt.name,
          price: tt.price,
          quantity: tt.quantity,
          quantity_sold: tt.quantity_sold,
          max_per_order: tt.max_per_order ?? 10,
        })),
      })
      setLoading(false)
    }
    if (user) load()
  }, [id, user, navigate, reset])

  // Google Places autocomplete
  const initAutocomplete = useCallback(() => {
    if (!locationInputRef.current || !window.google?.maps?.places) return
    const ac = new window.google.maps.places.Autocomplete(locationInputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'ca' },
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const addr = place.formatted_address || place.name || ''
      if (addr) setValue('location', addr, { shouldValidate: true })
      const cityComp = place.address_components?.find(c =>
        c.types.includes('locality') || c.types.includes('administrative_area_level_3')
      )
      if (cityComp) setValue('city', cityComp.long_name, { shouldValidate: true })
    })
  }, [setValue])

  useEffect(() => {
    if (!GMAPS_KEY || loading) return
    if (window.google?.maps?.places) { initAutocomplete(); return }
    if (document.getElementById('gmaps-places-script')) { window.__gmapsCallback = initAutocomplete; return }
    window.__gmapsCallback = initAutocomplete
    const script = document.createElement('script')
    script.id = 'gmaps-places-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&loading=async&callback=__gmapsCallback`
    script.async = true; script.defer = true
    document.head.appendChild(script)
  }, [initAutocomplete, loading])

  const { ref: rhfLocationRef, ...locationRest } = register('location')

  function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function notifyAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/notify-admin-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ event_id: id }),
      })
    } catch (err) {
      console.error('Admin notification failed:', err.message)
    }
  }

  async function onSubmit(data, publish = false) {
    setError(null)
    setSaving(true)
    try {
      const { error: evErr } = await supabase.from('events').update({
        title: data.title,
        description: data.description,
        is_online: data.is_online ?? false,
        location: data.is_online ? null : data.location,
        city: data.is_online ? null : data.city,
        community_tag: data.community_tag,
        event_type: data.event_type,
        event_date: data.event_date,
        ...(publish ? { status: 'pending' } : {}),
      }).eq('id', id)
      if (evErr) throw evErr

      // 2. Upload new banner if changed
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
        if (!allowedExts.includes(ext.toLowerCase())) {
          throw new Error(`Unsupported image format ".${ext}". Please upload a JPG, PNG, or WebP file.`)
        }
        if (bannerFile.size > 5 * 1024 * 1024) {
          throw new Error('Image is too large. Please upload a file under 5 MB.')
        }
        const path = `${id}/banner.${ext}`
        const { error: upErr } = await supabase.storage.from('banners').upload(path, bannerFile, { upsert: true })
        if (upErr) {
          throw new Error(`Banner upload failed: ${upErr.message}. Check that you are signed in and the file is a valid image.`)
        }
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
        const { error: updateErr } = await supabase.from('events').update({ banner_url: urlData.publicUrl }).eq('id', id)
        if (updateErr) throw new Error(`Banner saved but could not update event: ${updateErr.message}`)
      }

      // 3. Upsert ticket types
      const savedIds = savedTTs.map(t => t.id)
      const submittedIds = data.ticket_types.filter(t => t.id).map(t => t.id)

      // Delete removed ticket types (only if no sales)
      const removedIds = savedIds.filter(sid => !submittedIds.includes(sid))
      for (const rid of removedIds) {
        const tt = savedTTs.find(t => t.id === rid)
        if (tt && tt.quantity_sold > 0) continue // skip — has sales, cannot delete
        await supabase.from('ticket_types').delete().eq('id', rid)
      }

      for (const tt of data.ticket_types) {
        if (tt.id) {
          // Guard: quantity cannot go below quantity_sold
          const saved = savedTTs.find(s => s.id === tt.id)
          const safeQty = saved ? Math.max(tt.quantity, saved.quantity_sold) : tt.quantity
          await supabase.from('ticket_types').update({
            name: tt.name,
            price: tt.price,
            quantity: safeQty,
            max_per_order: tt.max_per_order ?? 10,
          }).eq('id', tt.id)
        } else {
          // New ticket type
          await supabase.from('ticket_types').insert({
            event_id: id,
            name: tt.name,
            price: tt.price,
            quantity: tt.quantity,
            max_per_order: tt.max_per_order ?? 10,
          })
        }
      }

      if (publish) await notifyAdmin()

      navigate(lp('/dashboard'))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={lp('/dashboard')} className="inline-flex items-center gap-1.5 text-muted hover:text-gray-900 text-sm mb-6 transition">
          <ArrowLeft size={14} /> {t('eventForm.back')}
        </Link>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">{t('eventForm.editTitle')}</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

        <form className="space-y-6">
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">{t('eventForm.eventDetails')}</h2>

            <Input
              label={t('eventForm.eventTitle')}
              placeholder="e.g. Ottawa African Night"
              error={errors.title?.message}
              {...register('title', { required: t('eventForm.titleRequired') })}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">{t('eventForm.description')}</label>
              <textarea
                rows={4}
                placeholder="Tell people what to expect..."
                {...register('description')}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">{t('eventForm.dateTime')}</label>
              <input
                type="datetime-local"
                {...register('event_date', {
                  required: t('eventForm.dateRequired'),
                  validate: v => !v || new Date(v) > new Date(Date.now() - 86400000) || t('eventForm.datePast'),
                })}
                className={`bg-white border ${errors.event_date ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition [color-scheme:light]`}
              />
              {errors.event_date && <p className="text-red-500 text-xs">{errors.event_date.message}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                {...register('is_online', {
                  onChange: e => {
                    if (e.target.checked) {
                      setValue('location', '', { shouldValidate: true })
                      setValue('city', '', { shouldValidate: true })
                    }
                  }
                })}
                className="w-4 h-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm text-gray-700">{t('eventForm.onlineEvent')}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">{t('eventForm.venue')}</label>
                <input
                  {...locationRest}
                  ref={(el) => { rhfLocationRef(el); locationInputRef.current = el }}
                  placeholder="e.g. Shaw Centre, 55 Colonel By"
                  autoComplete="off"
                  disabled={isOnline}
                  className={`bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition ${isOnline ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">{t('eventForm.city')}</label>
                <input
                  type="text"
                  {...register('city')}
                  placeholder="e.g. Ottawa"
                  disabled={isOnline}
                  className={`bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition ${isOnline ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <Controller
              name="community_tag"
              control={control}
              render={({ field }) => (
                <CommunityInput label={t('eventForm.community')} value={field.value} onChange={field.onChange} />
              )}
            />

            <Controller
              name="event_type"
              control={control}
              defaultValue="Cultural show"
              render={({ field }) => (
                <Select label={t('eventForm.eventType')} {...field}>
                  {EVENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                </Select>
              )}
            />
          </div>

          {/* Banner */}
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">{t('eventForm.banner')}</h2>
            <label className="block cursor-pointer">
              {(bannerPreview || existingBanner) ? (
                <div className="relative rounded-xl overflow-hidden h-48">
                  <img src={bannerPreview ?? existingBanner} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <span className="text-white text-sm font-medium">{t('eventForm.changeImage')}</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary transition text-muted">
                  <Upload size={24} />
                  <span className="text-sm">{t('eventForm.uploadBanner')}</span>
                  <span className="text-xs text-gray-400">{t('eventForm.uploadHintEdit')}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>

          {/* Ticket types */}
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-gray-900">{t('eventForm.ticketTypes')}</h2>
              <button type="button" onClick={() => append({ name: '', price: 0, quantity: 100 })}
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> {t('eventForm.addType')}
              </button>
            </div>

            <div className="hidden sm:grid text-xs text-muted grid-cols-[1fr_7rem_6rem_2rem] gap-3 px-4">
              <span>{t('eventForm.name')}</span><span>{t('eventForm.price')}</span><span>{t('eventForm.capacity')}</span><span />
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const sold = field.quantity_sold ?? 0
                const hasSales = sold > 0
                return (
                  <div key={field.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-muted mb-1 block">{t('eventForm.name')}</label>
                        <input
                          placeholder={t('eventForm.namePlaceholder')}
                          {...register(`ticket_types.${index}.name`, { required: t('eventForm.nameRequired') })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition"
                        />
                        {errors?.ticket_types?.[index]?.name && (
                          <p className="text-red-500 text-xs mt-1">{errors.ticket_types[index].name.message}</p>
                        )}
                        {hasSales && <p className="text-xs text-amber-600 mt-1">{t('eventForm.soldWarning', { count: sold })}</p>}
                      </div>
                      <button type="button" onClick={() => remove(index)}
                        disabled={fields.length === 1 || hasSales}
                        title={hasSales ? t('eventForm.cannotRemove') : 'Remove'}
                        className="mt-6 p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-20 transition shrink-0"
                      ><Trash2 size={15} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1 block">{t('eventForm.price')}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                          <input type="number" min="0" step="0.01" placeholder="0.00"
                            {...register(`ticket_types.${index}.price`, { required: 'Required', min: { value: 0, message: '≥ 0' }, valueAsNumber: true })}
                            className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1 block">{t('eventForm.capacity')}</label>
                        <input type="number" min={sold || 1} placeholder="Qty"
                          {...register(`ticket_types.${index}.quantity`, { required: 'Required', min: { value: sold || 1, message: `≥ ${sold || 1}` }, valueAsNumber: true })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {t('eventForm.fixErrorsSave')}
            </div>
          )}

          <div className="flex gap-3 justify-end flex-wrap">
            <Button type="button" variant="secondary" onClick={() => navigate(lp('/dashboard'))}>{t('eventForm.cancel')}</Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={handleSubmit(data => onSubmit(data, false))}>
              {saving ? t('eventForm.saving') : t('eventForm.saveDraft')}
            </Button>
            {(eventStatus === 'draft' || eventStatus === 'pending') && (
              <Button type="button" disabled={saving} onClick={handleSubmit(data => onSubmit(data, true))}>
                {saving ? t('eventForm.submitting') : t('eventForm.submitApproval')}
              </Button>
            )}
            {eventStatus === 'published' && (
              <Button type="button" disabled={saving} onClick={handleSubmit(data => onSubmit(data, false))}>
                {saving ? t('eventForm.saving') : t('eventForm.saveChanges')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
