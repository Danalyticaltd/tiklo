import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  // African
  'African', 'Nigerian', 'Ghanaian', 'Congolese', 'Senegalese', 'Somali', 'Ethiopian',
  'Eritrean', 'Cameroonian', 'Ivorian', 'Kenyan', 'Rwandan', 'Ugandan', 'Tanzanian',
  'South African', 'Zimbabwean', 'Malawian',
  // Caribbean
  'Caribbean', 'Jamaican', 'Haitian', 'Trinidadian', 'Barbadian', 'Guyanese',
  'Grenadian', 'St. Lucian', 'Antiguan',
  // South Asian
  'South Asian', 'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Nepali',
  // Southeast Asian
  'Filipino', 'Vietnamese', 'Thai', 'Cambodian', 'Indonesian', 'Malaysian', 'Burmese',
  // East Asian
  'Chinese', 'Korean', 'Japanese', 'Taiwanese',
  // Latin
  'Latin', 'Colombian', 'Mexican', 'Brazilian', 'Peruvian', 'Chilean', 'Venezuelan',
  'Ecuadorian', 'Argentine', 'Salvadoran', 'Guatemalan', 'Honduran',
  // Middle Eastern & North African
  'Lebanese', 'Egyptian', 'Iranian', 'Iraqi', 'Syrian', 'Moroccan', 'Algerian',
  'Tunisian', 'Turkish', 'Yemeni', 'Jordanian', 'Palestinian',
  // European
  'European', 'Scottish', 'Irish', 'French', 'Italian', 'Portuguese', 'Spanish',
  'Ukrainian', 'Polish', 'Russian', 'Greek', 'Romanian', 'German', 'Dutch',
  'Czech', 'Hungarian', 'Serbian', 'Croatian', 'Bulgarian',
  // Other
  'Indigenous', 'LGBTQ+', 'Faith / Church', 'Multicultural', 'Open to all', 'Other',
]

export default function CommunityInput({ value, onChange, label = 'Community' }) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Sync external value changes (e.g. form reset)
  useEffect(() => { setQuery(value ?? '') }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = query.trim().length === 0
    ? SUGGESTIONS.slice(0, 10)
    : SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 10)

  function select(suggestion) {
    setQuery(suggestion)
    onChange(suggestion)
    setOpen(false)
  }

  function handleChange(e) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative">
      {label && <label className="text-sm text-muted">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Scottish, Filipino, Church, Open to all..."
        autoComplete="off"
        className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
          {filtered.map(s => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => select(s)}
                className={`w-full text-left px-4 py-2 text-sm transition hover:bg-gray-50
                  ${query === s ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'}`}
              >
                {s}
              </button>
            </li>
          ))}
          {query.trim() && !SUGGESTIONS.some(s => s.toLowerCase() === query.toLowerCase()) && (
            <li>
              <button
                type="button"
                onMouseDown={() => select(query.trim())}
                className="w-full text-left px-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 transition border-t border-gray-100"
              >
                Use "{query.trim()}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
