import { Link } from 'react-router-dom'
import { Instagram, Twitter, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 mt-24">
      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <span className="font-heading font-bold text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Tiklo</span>
          <p className="mt-3 text-sm leading-relaxed">
            The ticketing platform for multicultural Canada — African, Caribbean, South Asian, Latin events and more.
          </p>
          <div className="flex gap-3 mt-5">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-white transition"><Instagram size={18} /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-white transition"><Twitter size={18} /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-white transition"><Facebook size={18} /></a>
          </div>
        </div>

        {/* Attendees */}
        <div>
          <p className="text-white font-semibold text-sm mb-4">Attendees</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition">Browse events</Link></li>
            <li><Link to="/login" className="hover:text-white transition">Sign in</Link></li>
            <li><Link to="/register" className="hover:text-white transition">Create account</Link></li>
          </ul>
        </div>

        {/* Organisers */}
        <div>
          <p className="text-white font-semibold text-sm mb-4">Organisers</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/register" className="hover:text-white transition">List your event</Link></li>
            <li><Link to="/dashboard" className="hover:text-white transition">Organiser dashboard</Link></li>
            <li><a href="mailto:hello@tiklo.ca" className="hover:text-white transition">Contact us</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span>&copy; {new Date().getFullYear()} Tiklo. All rights reserved.</span>
          <span>Made with love for multicultural Canada</span>
        </div>
      </div>
    </footer>
  )
}
