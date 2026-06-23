import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Users, TicketIcon, DollarSign, CalendarDays, CheckCircle, XCircle, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Button from '../../components/ui/Button'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [
      { count: organizerCount },
      { count: eventCount },
      { data: orders },
      { count: pendingOrgCount },
      { data: pendEvts },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'organizer').eq('approved', true),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('orders').select('*, events(title), ticket_types(name)').eq('status', 'paid').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'organizer').eq('approved', false),
      supabase.from('events')
        .select('*, profiles!organizer_id(full_name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    const revenue = (orders ?? []).reduce((s, o) => s + Number(o.platform_fee ?? 0), 0)
    const tickets = (orders ?? []).reduce((s, o) => s + (o.quantity ?? 0), 0)

    setStats({ organizerCount, eventCount, revenue, tickets, pendingOrgCount })
    setRecentOrders(orders ?? [])
    setPendingEvents(pendEvts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function approveEvent(id) {
    await supabase.from('events').update({ status: 'published' }).eq('id', id)
    await load()
  }

  async function rejectEvent(id) {
    await supabase.from('events').update({ status: 'draft' }).eq('id', id)
    await load()
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">Admin</h1>
            <p className="text-muted text-sm mt-1">Platform overview — Danalytica Ltd</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-primary hover:text-primary text-sm font-medium px-3 py-2 rounded-lg transition"
            >
              <Settings size={15} /> Settings
            </Link>
            <Link
              to="/admin/organizers"
              className="relative inline-flex items-center gap-2 bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-primary/20"
            >
              <Users size={15} /> Manage organizers
              {stats?.pendingOrgCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.pendingOrgCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <DollarSign size={18} className="text-primary mb-2" />
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Platform revenue</p>
              <p className="text-2xl font-bold text-primary">${stats.revenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <TicketIcon size={18} className="text-muted mb-2" />
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Tickets sold</p>
              <p className="text-2xl font-bold text-gray-900">{stats.tickets}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <Users size={18} className="text-muted mb-2" />
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Active organizers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.organizerCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <CalendarDays size={18} className="text-muted mb-2" />
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Live events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.eventCount}</p>
            </div>
          </div>
        )}

        {/* Pending event approvals */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Events pending approval</h2>
            {pendingEvents.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{pendingEvents.length}</span>
            )}
          </div>
          {pendingEvents.length === 0 ? (
            <p className="text-center text-muted py-10 text-sm">All caught up — no events waiting for review.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingEvents.map(ev => (
                <div key={ev.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {format(new Date(ev.event_date), 'EEE, MMM d, yyyy')} · {ev.city} · {ev.community_tag}
                    </p>
                    <p className="text-muted text-xs">
                      By {ev.profiles?.full_name ?? 'Unknown'} ({ev.profiles?.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/events/${ev.id}`} target="_blank" className="text-xs text-accent underline">Preview</Link>
                    <button
                      onClick={() => approveEvent(ev.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold transition"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => rejectEvent(ev.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted py-12">No orders yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map(o => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium truncate">{o.buyer_name}</p>
                    <p className="text-muted text-xs truncate">{o.events?.title} · {o.ticket_types?.name} × {o.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">+${Number(o.platform_fee ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-muted">${Number(o.subtotal ?? 0).toFixed(2)} total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
