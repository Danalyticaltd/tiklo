import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, TicketIcon, DollarSign, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: organizerCount },
        { count: eventCount },
        { data: orders },
        { count: pendingCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'organizer').eq('approved', true),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('orders').select('*, events(title), ticket_types(name)').eq('status', 'paid').order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'organizer').eq('approved', false),
      ])

      const revenue = (orders ?? []).reduce((s, o) => s + Number(o.platform_fee ?? 0), 0)
      const tickets = (orders ?? []).reduce((s, o) => s + (o.quantity ?? 0), 0)

      setStats({ organizerCount, eventCount, revenue, tickets, pendingCount })
      setRecentOrders(orders ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">Admin</h1>
            <p className="text-muted text-sm mt-1">Platform overview — Danalytica Ltd</p>
          </div>
          <Link
            to="/admin/organizers"
            className="relative inline-flex items-center gap-2 bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-primary/20"
          >
            <Users size={15} /> Manage organizers
            {stats?.pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pendingCount}
              </span>
            )}
          </Link>
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
