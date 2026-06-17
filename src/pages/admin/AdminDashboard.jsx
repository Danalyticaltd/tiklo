import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-bg text-slate-100 p-6">
      <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted mt-2">Platform overview — Phase 4</p>
      <Link to="/admin/organizers" className="inline-block mt-4 text-primary hover:underline text-sm">Manage organizers →</Link>
    </div>
  )
}
