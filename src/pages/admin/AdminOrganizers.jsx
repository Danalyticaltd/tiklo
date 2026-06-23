import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, User, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'

export default function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

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

  async function suspend(id) {
    // Suspend organizer + draft all their published/pending events immediately
    await Promise.all([
      supabase.from('profiles').update({ approved: false }).eq('id', id),
      supabase.from('events')
        .update({ status: 'draft' })
        .eq('organizer_id', id)
        .in('status', ['published', 'pending']),
    ])
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, approved: false } : o))
  }

  async function restore(id) {
    await supabase.from('profiles').update({ approved: true }).eq('id', id)
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, approved: true } : o))
  }

  const filtered = organizers.filter(o => {
    if (filter === 'active') return o.approved
    if (filter === 'suspended') return !o.approved
    return true
  })

  const suspendedCount = organizers.filter(o => !o.approved).length
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 mb-6 transition">
          <ArrowLeft size={14} /> Admin dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">Organisers</h1>
            <p className="text-muted text-sm mt-0.5">{organizers.length} total · {suspendedCount} suspended</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'active', label: 'Active' },
              { key: 'suspended', label: `Suspended${suspendedCount > 0 ? ` (${suspendedCount})` : ''}` },
              { key: 'all', label: 'All' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium
                  ${filter === f.key ? 'bg-primary border-primary text-white' : 'border-gray-200 text-muted hover:text-gray-900'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">No organisers in this category.</div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 border border-gray-100 shadow-sm">
            {filtered.map(o => {
              const eventCount = o.events?.[0]?.count ?? 0
              return (
                <div key={o.id} className="divide-y divide-gray-50">
                  {/* Main row */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    {o.avatar_url
                      ? <img src={o.avatar_url} alt={o.full_name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <User size={16} className="text-gray-400" />
                        </div>
                    }

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">{o.full_name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${o.approved ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {o.approved ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <p className="text-muted text-sm truncate">{o.email}</p>
                      <p className="text-muted text-xs mt-0.5">
                        Joined {format(new Date(o.created_at), 'MMM d, yyyy')} · {eventCount} event{eventCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {o.approved ? (
                        <button onClick={() => suspend(o.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-muted hover:border-red-400 hover:text-red-500 transition font-medium">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => restore(o.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 hover:bg-green-50 transition font-medium">
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                        className={`p-1.5 rounded-lg border border-gray-200 text-muted hover:text-gray-900 transition ${expanded === o.id ? 'bg-gray-50' : ''}`}
                        title="Payout details"
                      >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${expanded === o.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable payout details */}
                  {expanded === o.id && (
                    <div className="px-5 py-4 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payout details</p>
                      {!o.payment_method ? (
                        <p className="text-sm text-muted italic">No payment info submitted yet.</p>
                      ) : o.payment_method === 'interac' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚡</span>
                          <div>
                            <p className="text-xs text-muted">Interac e-Transfer</p>
                            <p className="text-sm font-medium text-gray-900">{o.payment_details || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: 'Bank', value: o.payment_details?.split('|')[0] },
                            { label: 'Institution', value: o.payment_details?.split('|')[1] },
                            { label: 'Transit', value: o.payment_details?.split('|')[2] },
                            { label: 'Account', value: o.payment_details?.split('|')[3] },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs text-muted mb-0.5">{label}</p>
                              <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
