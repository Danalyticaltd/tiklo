import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import EventCard from './EventCard'

export default function EventCarousel({ events }) {
  const [index, setIndex] = useState(0)
  const total = events.length

  const next = useCallback(() => setIndex(i => Math.min(i + 1, total - 1)), [total])
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

  if (total === 0) return null

  const cardPercent = 100 / Math.min(total, 3)

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex gap-5 transition-transform duration-400 ease-in-out"
          style={{ transform: `translateX(calc(-${index * cardPercent}% - ${index > 0 ? index * 20 : 0}px))` }}
        >
          {events.map(event => (
            <div
              key={event.id}
              className="shrink-0"
              style={{ width: `calc(${cardPercent}% - ${total > 1 ? 14 : 0}px)` }}
            >
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Next */}
      {index < total - 1 && (
        <button
          onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === index ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
