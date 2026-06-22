import { Link, useNavigate } from 'react-router-dom'
import TikloLogo from './TikloLogo'

function BrowseLink() {
  const navigate = useNavigate()
  function handleClick(e) {
    e.preventDefault()
    navigate('/')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }
  return <a href="/" onClick={handleClick} className="text-muted hover:text-gray-900 transition">Browse events</a>
}

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <TikloLogo size={26} />
          <p className="mt-3 text-sm text-muted leading-relaxed">
            The easiest way to create, promote, and sell tickets for any event across Canada.
          </p>
        </div>

        {/* Events by city */}
        <div>
          <p className="text-gray-900 font-semibold text-sm mb-4">Events by City</p>
          <ul className="space-y-2 text-sm">
            {['Ottawa', 'Toronto', 'Montreal', 'Calgary', 'Vancouver'].map(c => (
              <li key={c}>
                <Link to={`/events/city/${c.toLowerCase()}`} className="text-muted hover:text-gray-900 transition">
                  Events in {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Organisers */}
        <div>
          <p className="text-gray-900 font-semibold text-sm mb-4">Organisers</p>
          <ul className="space-y-2 text-sm">
            <li><BrowseLink /></li>
            <li><Link to="/register" className="text-muted hover:text-gray-900 transition">Create your event</Link></li>
            <li><Link to="/dashboard" className="text-muted hover:text-gray-900 transition">Organiser dashboard</Link></li>
            <li><a href="mailto:hello@tiklo.ca" className="text-muted hover:text-gray-900 transition">Contact us</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} Tiklo. All rights reserved.</span>
          <span>Made with love by <a href="https://www.danalytica.ca" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition underline underline-offset-2">Danalytica Ltd</a></span>
        </div>
      </div>
    </footer>
  )
}
