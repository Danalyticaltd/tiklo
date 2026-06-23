import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function AdminSettings() {
  const [feePercent, setFeePercent]     = useState('')
  const [feeFlatCents, setFeeFlatCents] = useState('')
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['fee_percent', 'fee_flat_cents'])
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
        setFeePercent(map.fee_percent ?? '2.5')
        setFeeFlatCents(map.fee_flat_cents ?? '99')
        setLoading(false)
      })
  }, [])

  async function save() {
    setMsg(null)
    const pct  = parseFloat(feePercent)
    const flat = parseInt(feeFlatCents, 10)
    if (isNaN(pct)  || pct  < 0 || pct  > 100) return setMsg({ ok: false, text: 'Fee % must be between 0 and 100.' })
    if (isNaN(flat) || flat < 0)                return setMsg({ ok: false, text: 'Flat fee must be 0 or more cents.' })

    setSaving(true)
    const { error } = await supabase.from('settings').upsert([
      { key: 'fee_percent',    value: String(pct),  updated_at: new Date().toISOString() },
      { key: 'fee_flat_cents', value: String(flat), updated_at: new Date().toISOString() },
    ])
    setSaving(false)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Rates updated — new checkouts will use these immediately.' })
  }

  const exampleSubtotal = 50
  const previewFee = feePercent && feeFlatCents
    ? (exampleSubtotal * (parseFloat(feePercent) / 100) + parseInt(feeFlatCents, 10) / 100).toFixed(2)
    : '—'
  const previewNet = feePercent && feeFlatCents
    ? (exampleSubtotal - parseFloat(previewFee)).toFixed(2)
    : '—'

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 mb-6 transition">
          <ArrowLeft size={14} /> Admin dashboard
        </Link>

        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Platform settings</h1>
        <p className="text-muted text-sm mb-8">Fee rates are applied live — no redeploy needed.</p>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            {msg && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {msg.text}
              </div>
            )}

            <div>
              <h2 className="font-semibold text-gray-900 mb-4">Ticket fee structure</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted">Platform fee (%)</label>
                  <div className="relative">
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={feePercent}
                      onChange={e => setFeePercent(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-gray-900 focus:outline-none focus:border-primary transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted">Applied to order subtotal</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted">Flat fee per ticket</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¢</span>
                    <input
                      type="number" min="0" step="1"
                      value={feeFlatCents}
                      onChange={e => setFeeFlatCents(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 pl-7 text-gray-900 focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <p className="text-xs text-muted">In cents — 99 = $0.99</p>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1 border border-gray-100">
              <p className="font-medium text-gray-700 mb-2">Example — $50.00 order (1 ticket)</p>
              <div className="flex justify-between text-muted">
                <span>Subtotal</span><span>$50.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Platform fee ({feePercent}% + {feeFlatCents}¢)</span>
                <span className="text-primary font-medium">${previewFee}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>Organizer receives</span><span>${previewNet}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rates'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
