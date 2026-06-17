import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-bg text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
          <button onClick={logout} className="text-muted hover:text-slate-100 text-sm transition">Sign out</button>
        </div>
        <p className="text-muted mb-6">Welcome, {profile?.full_name ?? 'Organizer'}</p>
        <Link
          to="/dashboard/events/new"
          className="inline-block bg-primary hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-lg transition"
        >
          + Create event
        </Link>
        <p className="text-muted mt-8 text-sm">Event list — Phase 2</p>
      </div>
    </div>
  )
}
