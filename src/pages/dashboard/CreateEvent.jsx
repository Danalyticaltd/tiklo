import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, ArrowLeft, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import TicketTypeRow from '../../components/TicketTypeRow'
import CommunityInput from '../../components/CommunityInput'

const CITIES = ['Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver', 'Edmonton', 'Winnipeg', 'Halifax']
const TAGS = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']
const EVENT_TYPES = ['Cultural show', 'Community event', 'Concert', 'Meetup', 'Workshop', 'Conference', 'Festival', 'Fundraiser', 'Seminar', 'Sport Event', 'Networking', 'Other']

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function CreateEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [error, setError] = useState(null)

  const locationInputRef = useRef(null)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    mode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      title: '',
      description: '',
      location: '',
      city: 'Ottawa',
      community_tag: '',
      event_type: 'Cultural show',
      event_date: '',
      ticket_types: [{ name: 'General Admission', price: 0, quantity: 100 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticket_types' })

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
    if (!GMAPS_KEY) return
    if (window.google?.maps?.places) { initAutocomplete(); return }
    if (document.getElementById('gmaps-places-script')) {
      window.__gmapsCallback = initAutocomplete
      return
    }
    window.__gmapsCallback = initAutocomplete
    const script = document.createElement('script')
    script.id = 'gmaps-places-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&loading=async&callback=__gmapsCallback`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [initAutocomplete])

  const { ref: rhfLocationRef, ...locationRest } = register('location')

  function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadBanner(eventId) {
    if (!bannerFile) return null
    if (bannerFile.size > 5 * 1024 * 1024) throw new Error('Banner image must be under 5 MB.')
    if (!bannerFile.type.startsWith('image/')) throw new Error('Banner must be an image file (JPG, PNG, WEBP).')
    const ext = bannerFile.name.split('.').pop()
    const path = `${eventId}/banner.${ext}`
    const { error } = await supabase.storage.from('banners').upload(path, bannerFile, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('banners').getPublicUrl(path)
    return data.publicUrl
  }

  async function notifyAdmin(eventId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/notify-admin-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ event_id: eventId }),
      })
    } catch (err) {
      console.error('Admin notification failed:', err.message)
    }
  }

  async function onSubmit(data, publish = false) {
    setError(null)
    setSaving(true)
    try {
      const { data: event, error: eventErr } = await supabase.from('events').insert({
        organizer_id: user.id,
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        community_tag: data.community_tag,
        event_type: data.event_type,
        event_date: data.event_date,
        status: publish ? 'pending' : 'draft',
      }).select().single()
      if (eventErr) throw eventErr

      const bannerUrl = await uploadBanner(event.id)
      if (bannerUrl) {
        await supabase.from('events').update({ banner_url: bannerUrl }).eq('id', event.id)
      }

      const ticketInserts = data.ticket_types.map(tt => ({
        event_id: event.id,
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
      }))
      const { error: ttErr } = await supabase.from('ticket_types').insert(ticketInserts)
      if (ttErr) throw ttErr

      if (publish) notifyAdmin(event.id)

      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-muted hover:text-gray-900 text-sm mb-6 transition">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">Create event</h1>

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
                  {...register('event_date', {
                    required: 'Date is required',
                    validate: v => new Date(v) > new Date() || 'Event date must be in the future',
                  })}
                  className={`bg-white border ${errors.event_date ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition [color-scheme:light]`}
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
                  ref={(el) => {
                    rhfLocationRef(el)
                    locationInputRef.current = el
                  }}
                  placeholder="e.g. Shaw Centre, 55 Colonel By"
                  autoComplete="off"
                  className={`bg-white border ${errors.location ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition`}
                />
                {errors.location && <p className="text-red-500 text-xs">{errors.location.message}</p>}
              </div>
              <Controller
                name="community_tag"
                control={control}
                render={({ field }) => (
                  <CommunityInput label="Community" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <Controller
              name="event_type"
              control={control}
              defaultValue="Cultural show"
              render={({ field }) => (
                <Select label="Event type *" {...field}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              )}
            />
          </div>

          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900">Event flyer / poster</h2>
            <label className="block cursor-pointer">
              {bannerPreview ? (
                <div className="relative rounded-xl overflow-hidden h-48">
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <span className="text-white text-sm font-medium">Change image</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary transition text-muted">
                  <Upload size={24} />
                  <span className="text-sm">Click to upload your event flyer</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 5 MB · Portrait poster works great</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-gray-900">Ticket types</h2>
              <button
                type="button"
                onClick={() => append({ name: '', price: 0, quantity: 100 })}
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add type
              </button>
            </div>

            <div className="text-xs text-muted grid grid-cols-[1fr_7rem_6rem_2rem] gap-3 px-4">
              <span>Name</span><span>Price</span><span>Quantity</span><span />
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <TicketTypeRow
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              Please fix the errors above before continuing.
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              type="button" variant="secondary"
              disabled={saving}
              onClick={handleSubmit(data => onSubmit(data, false), () => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            >
              Save as draft
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSubmit(data => onSubmit(data, true), () => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            >
              {saving ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

