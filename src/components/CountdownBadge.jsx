import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns'

const COLORS = [
  'from-primary/20 to-orange-100 border-primary/20 text-primary',
  'from-teal-50 to-accent/10 border-accent/20 text-accent',
  'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  'from-pink-50 to-rose-100 border-pink-200 text-pink-700',
  'from-amber-50 to-yellow-100 border-amber-200 text-amber-700',
]

export default function CountdownBadge({ eventDate, className = '' }) {
  const date = new Date(eventDate)

  if (isPast(date)) return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 ${className}`}>
      Past event
    </span>
  )

  const days = differenceInDays(date, new Date())
  const hours = differenceInHours(date, new Date()) % 24
  const minutes = differenceInMinutes(date, new Date()) % 60

  let label
  if (days === 0 && hours === 0) label = `${minutes}m away!`
  else if (days === 0) label = hours === 1 ? 'In 1 hour!' : `In ${hours}h`
  else if (days === 1) label = 'Tomorrow!'
  else if (days <= 7) label = `In ${days} days`
  else if (days <= 30) label = `In ${Math.round(days / 7)} weeks`
  else label = `In ${Math.round(days / 30)} months`

  const colorIndex = Math.floor(Math.random() * COLORS.length)

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r border ${COLORS[0]} ${className}`}>
      {label}
    </span>
  )
}
