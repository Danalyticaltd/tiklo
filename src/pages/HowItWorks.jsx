import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus, CalendarPlus, Ticket, Clock, BarChart2,
  QrCode, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const STEPS = [
  {
    icon: UserPlus,
    title: 'Create your account',
    desc: 'Sign up with your email and create a password — no approval needed. Your organiser account is ready immediately.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: CalendarPlus,
    title: 'Create your event',
    desc: 'Fill in your event details: title, date, city, cover photo, and community tag. Everything is editable until you publish.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Ticket,
    title: 'Set your ticket types',
    desc: 'Add one or more ticket types — General, VIP, Early Bird, etc. Set a price (minimum $5.00) or mark them as free. Set your capacity per type.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Clock,
    title: 'Submit for review',
    desc: 'Once you\'re happy, submit your event. It enters a pending state and Tiklo reviews it — usually within 24 hours. You\'ll be notified when it\'s approved.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: BarChart2,
    title: 'Go live & monitor sales',
    desc: 'Once approved, your event is published and buyers can purchase tickets. Track sales, revenue, and attendance in real time from your dashboard.',
    color: 'bg-green-50 text-green-600',
  },
]

const FAQS_TEMPLATE = [
  {
    q: 'What are the fees?',
    a: (fee) => fee
      ? `Tiklo charges a service fee of ${fee.fee_percent}% + $${(fee.fee_flat_cents / 100).toFixed(2)} per ticket, paid by the buyer on top of your ticket price. You always receive the full face value of every ticket sold. Free events have no fees.`
      : 'Loading fee information…',
  },
  {
    q: 'What is the minimum ticket price?',
    a: () => 'Paid tickets must be priced at $5.00 or more. There is no minimum for free tickets.',
  },
  {
    q: 'Can I offer free tickets?',
    a: () => 'Yes. Set the ticket price to $0 when creating your ticket type. Free tickets have no service fee.',
  },
  {
    q: 'How long does the approval process take?',
    a: () => 'Most events are reviewed within 24 hours. You will receive an email notification once your event is approved or if changes are needed.',
  },
  {
    q: 'Why might my event be rejected?',
    a: () => 'Events may be sent back to draft if the description is incomplete, the cover image is missing or low quality, the event details are unclear, or the content does not meet our community guidelines. You can make edits and resubmit.',
  },
  {
    q: 'How do buyers receive their tickets?',
    a: () => 'After a successful purchase, buyers receive a confirmation email with a PDF ticket attachment. Each ticket has a unique QR code that can be scanned at the door.',
  },
  {
    q: 'Can I edit my event after publishing?',
    a: () => 'Yes. You can update your event details at any time from your dashboard. Changes to ticket prices or types after sales have started are not recommended as they may confuse existing buyers.',
  },
  {
    q: 'How do I cancel an event?',
    a: () => 'Go to your event in the dashboard and contact Tiklo support to cancel. We will handle buyer notifications and coordinate any refunds.',
  },
  {
    q: 'When and how do I receive my payout?',
    a: () => 'Tiklo processes organiser payouts manually after your event. You receive the full face value of all tickets sold. Reach out to us at support@tiklo.ca after your event to initiate your payout.',
  },
  {
    q: 'What is the door sales QR poster?',
    a: () => 'From your event dashboard, you can download a branded QR code poster to display at the venue entrance. Guests who haven\'t bought a ticket can scan it to purchase on the spot from their phone.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left py-4 gap-4"
      >
        <span className="text-gray-900 font-medium text-sm">{q}</span>
        {open
          ? <ChevronUp size={16} className="text-muted shrink-0" />
          : <ChevronDown size={16} className="text-muted shrink-0" />
        }
      </button>
      {open && (
        <p className="text-muted text-sm pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function HowItWorks() {
  const [fee, setFee] = useState(null)

  useEffect(() => {
    supabase.from('settings').select('fee_percent, fee_flat_cents').single()
      .then(({ data }) => { if (data) setFee(data) })
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">For Organizers</span>
          <h1 className="font-heading text-4xl font-bold text-navy mb-4">How Tiklo works</h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Everything you need to create, manage, and sell tickets for your event — in minutes.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              to="/register"
              className="bg-primary hover:bg-[#574BFF] text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm shadow-primary/20 text-sm"
            >
              Create your first event
            </Link>
            <Link
              to="/login"
              className="border border-gray-200 text-navy hover:border-primary hover:text-primary font-medium px-6 py-3 rounded-xl transition text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="font-heading text-2xl font-bold text-navy mb-8">Getting started</h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-bold text-muted">{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Door sales callout */}
      <div className="max-w-3xl mx-auto px-4 pb-14">
        <div className="bg-primary/[0.06] border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <QrCode size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Selling tickets at the door</h3>
            <p className="text-muted text-sm leading-relaxed">
              From your event dashboard, download a branded QR code poster. Print it or display it at the entrance.
              Guests scan it with their phone, land on your event page, and complete their purchase in seconds —
              no cash, no manual tracking.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="font-heading text-2xl font-bold text-navy mb-6">Frequently asked questions</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 px-5">
          {FAQS_TEMPLATE.map(({ q, a }, i) => (
            <FaqItem key={i} q={q} a={a(fee)} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted text-sm">
            Still have questions?{' '}
            <a href="mailto:support@tiklo.ca" className="text-primary font-medium hover:underline">
              Contact us at support@tiklo.ca
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
