import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function PaymentInfo() {
  const { user, profile, fetchProfile } = useAuth()
  const [method, setMethod] = useState('interac')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile) {
      setMethod(profile.payment_method ?? 'interac')
      setDetails(profile.payment_details ?? '')
    }
  }, [profile])

  async function handleSave() {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ payment_method: method, payment_details: details })
        .eq('id', user.id)
      if (err) throw err
      if (typeof fetchProfile === 'function') await fetchProfile(user.id)
      setSaved(true)
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

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-1">Payment info</h1>
        <p className="text-muted text-sm mb-8">Tell us how you'd like to receive your payouts after each event.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
            <CheckCircle size={15} /> Payment info saved.
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">

          {/* Method selector */}
          <div>
            <label className="block text-sm text-muted mb-3">Preferred payout method</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'interac', label: 'Interac e-Transfer', emoji: '🇨🇦' },
                { value: 'bank_transfer', label: 'Bank transfer', emoji: '🏦' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setMethod(opt.value); setDetails('') }}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition text-sm font-medium
                    ${method === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          {method === 'interac' && (
            <div>
              <label className="block text-sm text-muted mb-1">Interac e-Transfer email</label>
              <input
                type="email"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
              />
              <p className="text-xs text-muted mt-1.5">We'll send your payout to this email via Interac e-Transfer.</p>
            </div>
          )}

          {method === 'bank_transfer' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted mb-1">Bank name</label>
                <input
                  type="text"
                  value={details.split('|')[0] ?? ''}
                  onChange={e => {
                    const parts = details.split('|')
                    parts[0] = e.target.value
                    setDetails(parts.join('|'))
                  }}
                  placeholder="e.g. TD Bank, RBC, Scotiabank"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Transit number</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={details.split('|')[1] ?? ''}
                    onChange={e => {
                      const parts = details.split('|')
                      parts[1] = e.target.value
                      setDetails(parts.join('|'))
                    }}
                    placeholder="00000"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Account number</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={details.split('|')[2] ?? ''}
                    onChange={e => {
                      const parts = details.split('|')
                      parts[2] = e.target.value
                      setDetails(parts.join('|'))
                    }}
                    placeholder="000000000"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>
              <p className="text-xs text-muted">Your banking details are stored securely and only used for payout processing.</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 text-xs text-muted leading-relaxed">
            💡 Tiklo sends payouts within <span className="font-medium text-gray-700">5 business days</span> after your event ends. A platform fee of <span className="font-medium text-gray-700">2.5% + $0.99 per ticket</span> is deducted before payout. Free events have no fee.
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !details.trim()}>
              {saving ? 'Saving...' : 'Save payment info'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
