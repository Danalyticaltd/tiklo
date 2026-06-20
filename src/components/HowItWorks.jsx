import { Link } from 'react-router-dom'
import { CalendarPlus, ClipboardCheck, Ticket } from 'lucide-react'

const STEPS = [
  {
    icon: CalendarPlus,
    num: '01',
    title: 'Create your event',
    body: 'Fill in the details — date, venue, ticket types and pricing. Upload your event flyer.',
  },
  {
    icon: ClipboardCheck,
    num: '02',
    title: 'Get approved',
    body: 'Our team reviews your event within 24 hours to keep the community safe and on-brand.',
  },
  {
    icon: Ticket,
    num: '03',
    title: 'Sell & get paid',
    body: 'Tickets go live instantly after approval. Track sales in real time and export your attendee list.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-gray-950 text-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">For organisers</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-2">Sell tickets in 3 steps</h2>
          <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm leading-relaxed">
            No setup fees. No monthly cost. We take a small platform fee only when you sell.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {STEPS.map(({ icon: Icon, num, title, body }) => (
            <div key={num} className="relative bg-gray-900 rounded-2xl p-7 border border-gray-800 hover:border-primary/50 transition group">
              <span className="absolute top-5 right-6 font-heading font-bold text-5xl text-gray-800 group-hover:text-primary/20 transition select-none">{num}</span>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-primary to-orange-400 text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition shadow-lg shadow-primary/30 text-sm"
          >
            Start selling tickets - it's free
          </Link>
        </div>
      </div>
    </section>
  )
}
