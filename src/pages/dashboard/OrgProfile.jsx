import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function OrgProfile() {
  const { user, profile, fetchProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name ?? '')
      setBio(profile.bio ?? '')
      setAvatarPreview(profile.avatar_url ?? null)
    }
  }, [profile])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url ?? null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop().toLowerCase()
        const allowed = ['jpg', 'jpeg', 'png', 'webp']
        if (!allowed.includes(ext)) throw new Error(`Unsupported format ".${ext}". Use JPG, PNG, or WebP.`)
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
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-muted hover:text-gray-900 text-sm mb-6 transition">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">Organiser profile</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">Profile saved!</div>}

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
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
            <p className="text-xs text-muted">Click to upload logo · JPG, PNG, WebP · max 2 MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Display name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name or organisation name"
              className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Short description</label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell attendees who you are and what kind of events you organise..."
              className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
