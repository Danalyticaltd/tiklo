import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending' | 'approved' | 'all'

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*, events(count)')
        .eq('role', 'organizer')
        .order('created_at', { ascending: false })
      setOrganizers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function approve(id) {
    await supabase.from('profiles').update({ approved: true }).eq('id', id)
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, approved: true } : o))
  }

  async function revoke(id) {
    await supabase.from('profiles').update({ approved: false }).eq('id', id)
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, approved: false } : o))
  }

  const filtered = organizers.filter(o => {
    if (filter === 'pending') return !o.approved
    if (filter === 'approved') return o.approved
    return true
  })

  const pendingCount = organizers.filter(o => !o.approved).length

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted hover:text-slate-100 mb-6">
          <ArrowLeft size={14} /> Admin dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-100">Organizers</h1>
            {pendingCount > 0 && (
              <p className="text-amber-400 text-sm mt-1">{pendingCount} pending approval</p>
            )}
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize font-medium
                  ${filter === f ? 'bg-primary border-primary text-white' : 'border-slate-700 text-muted hover:text-slate-100'}`}
              >
                {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">No organizers in this category.</div>
        ) : (
          <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-slate-800">
            {filtered.map(o => (
              <div key={o.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-100 truncate">{o.full_name}</p>
                    {o.approved
                      ? <span className="text-xs text-green-400 font-medium">Approved</span>
                      : <span className="text-xs text-amber-400 font-medium">Pending</span>}
                  </div>
                  <p className="text-muted text-sm truncate">{o.email}</p>
                  <p className="text-muted text-xs mt-0.5">Joined {format(new Date(o.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.approved ? (
                    <button
                      onClick={() => revoke(o.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-muted hover:border-red-500 hover:text-red-400 transition"
                    >
                      <XCircle size={13} /> Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => approve(o.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-600 text-green-400 hover:bg-green-500/10 transition font-medium"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
