import { Ticket, ScanLine, CreditCard, BellRing, BarChart3, BadgeDollarSign } from 'lucide-react'

const FEATURES = [
  {
    icon: Ticket,
    emoji: '🎟',
    label: 'Easy Ticketing',
    desc: 'Create and publish your event in minutes. Add ticket types, set prices, go live.',
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: ScanLine,
    emoji: '📱',
    label: 'QR Check-In',
    desc: 'Scan attendees at the door with any phone — no app needed.',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  },
  {
    icon: CreditCard,
    emoji: '💳',
    label: 'Secure Payments',
    desc: 'Stripe-powered checkout. Funds go directly to your bank account.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    icon: BellRing,
    emoji: '📧',
    label: 'Automated Reminders',
    desc: 'Attendees get ticket confirmation, 7-day, and 24-hour reminders automatically.',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    icon: BarChart3,
    emoji: '📊',
    label: 'Real-Time Analytics',
    desc: 'Watch ticket sales, revenue, and attendance update live from your dashboard.',
    color: 'bg-rose-50 text-rose-600 border-rose-100',
  },
  {
    icon: BadgeDollarSign,
    emoji: '💸',
    label: 'No Monthly Fee',
    desc: 'Only pay when you sell tickets — no subscription, no setup cost. Free events are always free.',
    color: 'bg-green-50 text-green-600 border-green-100',
  },
]

export default function WhyTiklo() {
  return (
    <section className="bg-white border-t border-[#E3E8EE] py-20 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Why Tiklo</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-navy mt-2">
            Everything you need to sell tickets
          </h2>
          <p className="text-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">
            Built for Canadian cultural events, community gatherings, and independent organizers.
          </p>
        </div>

        {/* Icon strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center p-5 rounded-2xl border border-[#E3E8EE] hover:border-primary/30 hover:shadow-md transition group bg-surface"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={26} strokeWidth={1.8} />
              </div>
              <h3 className="font-heading font-bold text-navy text-sm mb-1.5 leading-snug">{label}</h3>
              <p className="text-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
