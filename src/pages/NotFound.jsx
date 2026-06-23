import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-heading font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-navy mb-2">Page not found</h1>
        <p className="text-muted mb-8">That link doesn't exist or may have been moved.</p>
        <Link to="/" className="bg-primary hover:bg-[#574BFF] text-white font-semibold px-6 py-2.5 rounded-xl transition">
          Back to events
        </Link>
      </div>
      <Footer />
    </div>
  )
}
