import { Link } from 'react-router-dom'
import { CalendarPlus, ClipboardCheck, Ticket } from 'lucide-react'

const STEPS = [
  {
    icon: CalendarPlus,
    num: '01',
    title: 'Create Your Event',
    body: 'Add your event details, set ticket types and pricing, and upload your event flyer — in minutes.',
  },
  {
    icon: Ticket,
    num: '02',
    title: 'Sell Tickets Online',
    body: 'Your event goes live after a quick review. Share your link and start collecting payments instantly.',
  },
  {
    icon: ClipboardCheck,
    num: '03',
    title: 'Check In Attendees',
    body: 'Scan QR codes at the door with any smartphone. Track arrivals in real time from your dashboard.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 border-t border-gray-200 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">For organisers</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mt-2">Sell tickets in 3 steps</h2>
          <p className="text-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">
            No setup fees. No monthly cost. We take a small platform fee only when you sell.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {STEPS.map(({ icon: Icon, num, title, body }) => (
            <div key={num} className="relative bg-white rounded-2xl p-7 border border-gray-200 hover:border-primary/40 hover:shadow-md transition group">
              <span className="absolute top-5 right-6 font-heading font-bold text-5xl text-gray-100 group-hover:text-primary/10 transition select-none">{num}</span>
              <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-5 border border-primary/15">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-primary to-orange-400 text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition shadow-md shadow-primary/20 text-sm"
          >
            Start selling tickets - it's free
          </Link>
        </div>
      </div>
    </section>
  )
}
