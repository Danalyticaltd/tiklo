import { Zap, ShieldCheck, QrCode, HeartHandshake, Mail, Smartphone } from 'lucide-react'

const BENEFITS = [
  {
    icon: Zap,
    title: 'Easy Event Setup',
    body: 'Create and publish your event in under 5 minutes. No technical skills required.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    body: 'Stripe-powered checkout. PCI-compliant. Funds deposited directly to your bank.',
  },
  {
    icon: QrCode,
    title: 'QR Code Ticketing',
    body: 'Every ticket includes a unique QR code. Check in attendees instantly at the door.',
  },
  {
    icon: Mail,
    title: 'Instant Ticket Delivery',
    body: 'Tickets emailed immediately after purchase with a PDF attachment ready to print.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    body: 'Optimized for all devices. Attendees buy and check in from their phone.',
  },
  {
    icon: HeartHandshake,
    title: 'Canadian Support',
    body: 'Responsive support from a local Canadian team that understands your community.',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface rounded-2xl p-6 border border-[#E3E8EE] hover:border-primary/30 hover:shadow-md transition group">
              <div className="w-11 h-11 rounded-xl bg-[#EDE9FF] flex items-center justify-center mb-4 border border-primary/20 group-hover:bg-primary/20 transition">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-navy text-base mb-1.5">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
