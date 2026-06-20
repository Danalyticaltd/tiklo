import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import EventCard from './EventCard'

export default function EventCarousel({ events }) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef(null)
  const total = events.length

  const scrollTo = useCallback((i) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[i]
    if (!card) return
    track.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    setIndex(i)
  }, [])

  const next = useCallback(() => scrollTo((index + 1) % total), [index, total, scrollTo])
  const prev = useCallback(() => scrollTo((index - 1 + total) % total), [index, total, scrollTo])

  // Sync dot when user swipes natively
  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const cardWidth = track.children[0]?.offsetWidth ?? 1
    const i = Math.round(track.scrollLeft / cardWidth)
    if (i !== index) setIndex(i % total)
  }

  if (total === 0) return null

  return (
    <div className="relative">
      {/* Scrollable track — 1 card on mobile, 3 on desktop */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2"
      >
        {events.map(event => (
          <div
            key={event.id}
            className="snap-start shrink-0 w-[85vw] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
          >
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {/* Arrows — always shown, loop */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${i === index ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
