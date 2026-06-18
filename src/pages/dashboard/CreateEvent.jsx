import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, ArrowLeft, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import TicketTypeRow from '../../components/TicketTypeRow'

const CITIES = ['Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver', 'Edmonton', 'Winnipeg', 'Halifax']
const TAGS = ['African', 'Caribbean', 'South Asian', 'Latin', 'Other']

export default function CreateEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [error, setError] = useState(null)

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      location: '',
      city: 'Ottawa',
      community_tag: 'African',
      event_date: '',
      ticket_types: [{ name: 'General Admission', price: 0, quantity: 100 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticket_types' })

  function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadBanner(eventId) {
    if (!bannerFile) return null
    const ext = bannerFile.name.split('.').pop()
    const path = `${eventId}/banner.${ext}`
    const { error } = await supabase.storage.from('banners').upload(path, bannerFile, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('banners').getPublicUrl(path)
    return data.publicUrl
  }

  async function onSubmit(data, publish = false) {
    setError(null)
    setSaving(true)
    try {
      // 1. Insert event
      const { data: event, error: eventErr } = await supabase.from('events').insert({
        organizer_id: user.id,
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        community_tag: data.community_tag,
        event_date: data.event_date,
        status: publish ? 'published' : 'draft',
      }).select().single()
      if (eventErr) throw eventErr

      // 2. Upload banner
      const bannerUrl = await uploadBanner(event.id)
      if (bannerUrl) {
        await supabase.from('events').update({ banner_url: bannerUrl }).eq('id', event.id)
      }

      // 3. Insert ticket types
      const ticketInserts = data.ticket_types.map(tt => ({
        event_id: event.id,
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
      }))
      const { error: ttErr } = await supabase.from('ticket_types').insert(ticketInserts)
      if (ttErr) throw ttErr

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
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-muted hover:text-slate-100 text-sm mb-6 transition">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-heading text-3xl font-bold text-slate-100 mb-8">Create event</h1>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

        <form className="space-y-6">
          {/* Basic info */}
          <div className="bg-surface rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-slate-100">Event details</h2>

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
                className="bg-bg border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Date & time *</label>
                <input
                  type="datetime-local"
                  {...register('event_date', { required: 'Date is required' })}
                  className="bg-bg border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary transition [color-scheme:dark]"
                />
                {errors.event_date && <p className="text-red-400 text-xs">{errors.event_date.message}</p>}
              </div>

              <Select label="City *" {...register('city', { required: true })}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue / location"
                placeholder="e.g. Shaw Centre, 55 Colonel By"
                {...register('location')}
              />
              <Select label="Community" {...register('community_tag')}>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>

          {/* Banner upload */}
          <div className="bg-surface rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-slate-100">Banner image</h2>
            <label className="block cursor-pointer">
              {bannerPreview ? (
                <div className="relative rounded-xl overflow-hidden h-48">
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <span className="text-white text-sm font-medium">Change image</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary transition text-muted">
                  <Upload size={24} />
                  <span className="text-sm">Click to upload banner</span>
                  <span className="text-xs text-slate-600">PNG, JPG up to 5 MB · 16:9 recommended</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>

          {/* Ticket types */}
          <div className="bg-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-slate-100">Ticket types</h2>
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

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button" variant="secondary"
              disabled={saving}
              onClick={handleSubmit(data => onSubmit(data, false))}
            >
              Save as draft
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSubmit(data => onSubmit(data, true))}
            >
              {saving ? 'Publishing…' : 'Publish event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
