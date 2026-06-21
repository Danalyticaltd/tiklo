import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, ArrowLeft, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import CommunityInput from '../../components/CommunityInput'

const CITIES = ['Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver', 'Edmonton', 'Winnipeg', 'Halifax']
const TAGS = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']
const EVENT_TYPES = ['Concert', 'Meetup', 'Workshop', 'Conference', 'Festival', 'Fundraiser', 'Seminar', 'Sports', 'Networking', 'Other']
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function EditEvent() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [existingBanner, setExistingBanner] = useState(null)
  const [error, setError] = useState(null)
  const [savedTTs, setSavedTTs] = useState([]) // ticket types as loaded from DB

  const locationInputRef = useRef(null)

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm({
    mode: 'onChange',
    shouldFocusError: true,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticket_types' })

  // Load existing event + ticket types
  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: tts }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('ticket_types').select('*').eq('event_id', id).order('created_at'),
      ])
      if (!ev || ev.organizer_id !== user.id) { navigate('/dashboard'); return }
      setExistingBanner(ev.banner_url ?? null)
      setSavedTTs(tts ?? [])
      reset({
        title: ev.title,
        description: ev.description ?? '',
        location: ev.location ?? '',
        city: ev.city,
        community_tag: ev.community_tag,
        event_type: ev.event_type ?? 'Concert',
        event_date: ev.event_date ? ev.event_date.slice(0, 16) : '',
        ticket_types: (tts ?? []).map(tt => ({
          id: tt.id,
          name: tt.name,
          price: tt.price,
          quantity: tt.quantity,
          quantity_sold: tt.quantity_sold,
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

  async function onSubmit(data) {
    setError(null)
    setSaving(true)
    try {
      // 1. Update event fields
      const { error: evErr } = await supabase.from('events').update({
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        community_tag: data.community_tag,
        event_type: data.event_type,
        event_date: data.event_date,
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
          }).eq('id', tt.id)
        } else {
          // New ticket type
          await supabase.from('ticket_types').insert({
            event_id: id,
            name: tt.name,
            price: tt.price,
            quantity: tt.quantity,
          })
        }
      }

      navigate('/dashboard')
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
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-muted hover:text-gray-900 text-sm mb-6 transition">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">Edit event</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

        <form className="space-y-6">
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">Event details</h2>

            <Input
              label="Event title *"
              placeholder="e.g. Ottawa African Night"
              error={errors.title?.message}
              {...register('title', { required: 'Title is required' })}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">Description</label>
              <textarea
                rows={4}
                placeholder="Tell people what to expect..."
                {...register('description')}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Date & time *</label>
                <input
                  type="datetime-local"
                  {...register('event_date', { required: 'Date is required' })}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition [color-scheme:light]"
                />
                {errors.event_date && <p className="text-red-500 text-xs">{errors.event_date.message}</p>}
              </div>
              <Select label="City *" {...register('city', { required: true })}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Venue / location</label>
                <input
                  {...locationRest}
                  ref={(el) => { rhfLocationRef(el); locationInputRef.current = el }}
                  placeholder="e.g. Shaw Centre, 55 Colonel By"
                  autoComplete="off"
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <Controller
                name="community_tag"
                control={control}
                render={({ field }) => (
                  <CommunityInput label="Community" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <Select label="Event type *" {...register('event_type', { required: true })}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          {/* Banner */}
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">Banner image</h2>
            <label className="block cursor-pointer">
              {(bannerPreview || existingBanner) ? (
                <div className="relative rounded-xl overflow-hidden h-48">
                  <img src={bannerPreview ?? existingBanner} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <span className="text-white text-sm font-medium">Change image</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary transition text-muted">
                  <Upload size={24} />
                  <span className="text-sm">Click to upload banner</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 5 MB · 16:9 recommended</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>

          {/* Ticket types */}
          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-gray-900">Ticket types</h2>
              <button type="button" onClick={() => append({ name: '', price: 0, quantity: 100 })}
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Add type
              </button>
            </div>

            <div className="text-xs text-muted grid grid-cols-[1fr_7rem_6rem_2rem] gap-3 px-4">
              <span>Name</span><span>Price</span><span>Capacity</span><span />
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const sold = field.quantity_sold ?? 0
                const hasSales = sold > 0
                return (
                  <div key={field.id} className="flex gap-3 items-start bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <input
                        placeholder="Ticket name (e.g. General, VIP)"
                        {...register(`ticket_types.${index}.name`, { required: 'Name required' })}
                        className="w-full bg-transparent border-b border-gray-300 focus:border-primary pb-1 text-gray-900 placeholder-gray-400 focus:outline-none text-sm transition"
                      />
                      {errors?.ticket_types?.[index]?.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.ticket_types[index].name.message}</p>
                      )}
                      {hasSales && <p className="text-xs text-amber-600 mt-1">{sold} sold — capacity cannot go below {sold}</p>}
                    </div>
                    <div className="w-28">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                        <input type="number" min="0" step="0.01" placeholder="0.00"
                          {...register(`ticket_types.${index}.price`, { required: 'Required', min: { value: 0, message: '≥ 0' }, valueAsNumber: true })}
                          className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition"
                        />
                      </div>
                    </div>
                    <div className="w-24">
                      <input type="number" min={sold || 1} placeholder="Qty"
                        {...register(`ticket_types.${index}.quantity`, { required: 'Required', min: { value: sold || 1, message: `≥ ${sold || 1}` }, valueAsNumber: true })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition"
                      />
                    </div>
                    <button type="button" onClick={() => remove(index)}
                      disabled={fields.length === 1 || hasSales}
                      title={hasSales ? 'Cannot remove — tickets already sold' : 'Remove'}
                      className="mt-1.5 text-gray-400 hover:text-red-500 disabled:opacity-20 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              Please fix the errors above before saving.
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={handleSubmit(onSubmit)}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
