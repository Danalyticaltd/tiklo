import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PageLoader from './components/PageLoader'

// Public pages
import Home from './pages/Home'
import CityEvents from './pages/CityEvents'
import EventPage from './pages/EventPage'
import Checkout from './pages/Checkout'
import TicketConfirm from './pages/TicketConfirm'
import Login from './pages/Login'
import Register from './pages/Register'
import Verify from './pages/Verify'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import MyTickets from './pages/MyTickets'
import NotFound from './pages/NotFound'

// Organizer dashboard
import Dashboard from './pages/dashboard/Dashboard'
import CreateEvent from './pages/dashboard/CreateEvent'
import EventDetail from './pages/dashboard/EventDetail'
import EditEvent from './pages/dashboard/EditEvent'
import CheckIn from './pages/dashboard/CheckIn'
import Connect from './pages/dashboard/Connect'
import OrgProfile from './pages/dashboard/OrgProfile'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrganizers from './pages/admin/AdminOrganizers'

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && profile?.role !== requiredRole) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/events/city/:city" element={<CityEvents />} />
          <Route path="/events/:slug" element={<EventPage />} />
          <Route path="/checkout/:orderId" element={<Checkout />} />
          <Route path="/ticket/confirmed" element={<TicketConfirm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Organizer */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/events/new" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/dashboard/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
          <Route path="/dashboard/events/:id/edit" element={<ProtectedRoute><EditEvent /></ProtectedRoute>} />
          <Route path="/dashboard/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><OrgProfile /></ProtectedRoute>} />
          <Route path="/checkin/:eventId" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/organizers" element={<ProtectedRoute requiredRole="admin"><AdminOrganizers /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
