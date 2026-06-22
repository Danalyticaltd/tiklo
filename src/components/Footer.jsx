import { Link, useNavigate } from 'react-router-dom'
import TikloLogo from './TikloLogo'

function BrowseLink() {
  const navigate = useNavigate()
  function handleClick(e) {
    e.preventDefault()
    navigate('/')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }
  return <a href="/" onClick={handleClick} className="text-white/45 hover:text-white/80 transition text-sm">Browse events</a>
}

const CITIES = ['Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver']
const CATEGORIES = ['Cultural events', 'Music', 'Conferences', 'Fundraisers', 'Workshops', 'Festivals']

export default function Footer() {
  return (
    <footer className="bg-navy">
      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <TikloLogo size={26} />
          </div>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            The easiest way to create, promote, and sell tickets for any event across Canada.
          </p>
        </div>

        {/* Events by city */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Events by City</p>
          <ul className="space-y-2.5">
            {CITIES.map(c => (
              <li key={c}>
                <Link to={`/events/city/${c.toLowerCase()}`} className="text-sm text-white/45 hover:text-white/80 transition">
                  Events in {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Organisers */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Organisers</p>
          <ul className="space-y-2.5">
            <li><BrowseLink /></li>
            <li><Link to="/register" className="text-sm text-white/45 hover:text-white/80 transition">Create your event</Link></li>
            <li><Link to="/dashboard" className="text-sm text-white/45 hover:text-white/80 transition">Organiser dashboard</Link></li>
            <li><a href="mailto:hello@tiklo.ca" className="text-sm text-white/45 hover:text-white/80 transition">Contact us</a></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Categories</p>
          <ul className="space-y-2.5">
            {CATEGORIES.map(c => (
              <li key={c}>
                <Link to="/" className="text-sm text-white/45 hover:text-white/80 transition">{c}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-white/25">&copy; {new Date().getFullYear()} Tiklo. All rights reserved.</span>
          <span className="text-xs text-white/25">Made with love by <a href="https://www.danalytica.ca" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition underline underline-offset-2">Danalytica Ltd</a></span>
        </div>
      </div>
    </footer>
  )
}
