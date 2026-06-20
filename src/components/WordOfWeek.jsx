// Rotating cultural word of the week — picks by ISO week number
const WORDS = [
  { word: 'Jambo', lang: 'Swahili', community: 'African', meaning: 'Hello / How are you', pronunciation: 'JAM-bo', flag: '🌍' },
  { word: 'Liming', lang: 'Trinidad Patois', community: 'Caribbean', meaning: 'Hanging out with friends, doing nothing in particular — pure vibes', pronunciation: 'LI-ming', flag: '🏝' },
  { word: 'Ubuntu', lang: 'Zulu / Nguni', community: 'African', meaning: 'I am because we are — humanity through community', pronunciation: 'oo-BOON-too', flag: '✊' },
  { word: 'Jugaad', lang: 'Hindi', community: 'South Asian', meaning: 'Clever hack or innovative fix — making it work with what you have', pronunciation: 'joo-GAAD', flag: '🇮🇳' },
  { word: 'Chévere', lang: 'Spanish', community: 'Latin', meaning: 'Cool, awesome, great — the highest compliment', pronunciation: 'CHE-ve-reh', flag: '🌶' },
  { word: 'Sankofa', lang: 'Twi (Ghana)', community: 'African', meaning: 'Go back and get it — learn from the past to move forward', pronunciation: 'san-KO-fah', flag: '🦅' },
  { word: 'Bashment', lang: 'Jamaican Patois', community: 'Caribbean', meaning: 'A wild, exciting party — the highest level of a good time', pronunciation: 'BASH-ment', flag: '🎉' },
  { word: 'Ashe', lang: 'Yoruba', community: 'African', meaning: 'So be it — an affirmation of divine energy and life force', pronunciation: 'AH-sheh', flag: '⚡' },
  { word: 'Riddim', lang: 'Jamaican Patois', community: 'Caribbean', meaning: 'Rhythm — the beat that moves your soul and your feet', pronunciation: 'RID-im', flag: '🥁' },
  { word: 'Harambee', lang: 'Swahili', community: 'African', meaning: 'Let us all pull together — a call for community unity', pronunciation: 'hah-RAM-bee', flag: '🤝' },
  { word: 'Desi', lang: 'Hindi / Urdu', community: 'South Asian', meaning: 'From the homeland — the identity of South Asians living abroad', pronunciation: 'DEH-see', flag: '🪷' },
  { word: 'Vibes', lang: 'Caribbean Creole', community: 'Caribbean', meaning: 'The feeling in the air — the energy of a space, person, or event', pronunciation: 'VYBZ', flag: '✨' },
  { word: 'Familia', lang: 'Spanish', community: 'Latin', meaning: 'Family — not just blood, but those you choose to keep close', pronunciation: 'fah-MEE-lyah', flag: '❤️' },
  { word: 'Jollof', lang: 'Wolof (West Africa)', community: 'African', meaning: 'The legendary rice dish — and a friendly rivalry that unites a continent', pronunciation: 'JOL-of', flag: '🍚' },
  { word: 'Soca', lang: 'Trinidad', community: 'Caribbean', meaning: 'Soul of Calypso — the upbeat music that makes everyone dance', pronunciation: 'SO-kah', flag: '🎶' },
  { word: 'Namaste', lang: 'Sanskrit', community: 'South Asian', meaning: 'I bow to the divine in you — a greeting of deep respect', pronunciation: 'nah-mah-STAY', flag: '🙏' },
  { word: 'Azonto', lang: 'Ga (Ghana)', community: 'African', meaning: 'A dance style from Ghana — energy, style, and pure joy', pronunciation: 'ah-ZON-toh', flag: '💃' },
  { word: 'Zumba', lang: 'Spanish / Colombian', community: 'Latin', meaning: 'Move fast, have fun — dance fitness that started a worldwide party', pronunciation: 'ZOOM-bah', flag: '🕺' },
  { word: 'Ole', lang: 'Spanish', community: 'Latin', meaning: 'Bravo! An exclamation of joy, approval, and pure hype', pronunciation: 'oh-LAY', flag: '🌹' },
  { word: 'Diaspora', lang: 'Greek', community: 'All', meaning: 'The scattering — communities who carry their culture wherever they go', pronunciation: 'die-AS-po-rah', flag: '🌐' },
]

function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const communityColors = {
  African: 'from-green-50 to-emerald-100 border-green-200 text-green-800',
  Caribbean: 'from-blue-50 to-cyan-100 border-blue-200 text-blue-800',
  'South Asian': 'from-orange-50 to-amber-100 border-orange-200 text-orange-800',
  Latin: 'from-red-50 to-rose-100 border-red-200 text-red-800',
  All: 'from-purple-50 to-indigo-100 border-purple-200 text-purple-800',
}

export default function WordOfWeek() {
  const week = getISOWeek(new Date())
  const word = WORDS[week % WORDS.length]
  const colorClass = communityColors[word.community] || communityColors.All

  return (
    <div className={`bg-gradient-to-r ${colorClass} border rounded-2xl px-5 py-4 flex items-center gap-4`}>
      <div className="text-3xl shrink-0">{word.flag}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-heading font-bold text-xl">{word.word}</span>
          <span className="text-xs font-medium opacity-60">/ {word.pronunciation} /</span>
          <span className="text-xs opacity-50">{word.lang}</span>
        </div>
        <p className="text-sm mt-0.5 opacity-80 line-clamp-1">{word.meaning}</p>
      </div>
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-xs font-semibold opacity-60 uppercase tracking-wide">Word of the week</p>
        <p className="text-xs opacity-50">{word.community}</p>
      </div>
    </div>
  )
}
