import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  UserPlus, CalendarPlus, Ticket, Clock, BarChart2,
  QrCode, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

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
      {open && <p className="text-muted text-sm pb-4 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function HowItWorks() {
  const { t } = useTranslation()
  const lp = useLangPath()
  const [fee, setFee] = useState(null)

  useEffect(() => {
    supabase.from('settings').select('fee_percent, fee_flat_cents').single()
      .then(({ data }) => { if (data) setFee(data) })
  }, [])

  const STEPS = [
    { icon: UserPlus,     title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc'), color: 'bg-primary/10 text-primary' },
    { icon: CalendarPlus, title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc'), color: 'bg-blue-50 text-blue-600' },
    { icon: Ticket,       title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc'), color: 'bg-violet-50 text-violet-600' },
    { icon: Clock,        title: t('howItWorks.step4Title'), desc: t('howItWorks.step4Desc'), color: 'bg-amber-50 text-amber-600' },
    { icon: BarChart2,    title: t('howItWorks.step5Title'), desc: t('howItWorks.step5Desc'), color: 'bg-green-50 text-green-600' },
  ]

  const FAQS = [
    { q: t('howItWorks.faq1Q'), a: fee ? t('howItWorks.faq1A', { percent: fee.fee_percent, flat: (fee.fee_flat_cents / 100).toFixed(2) }) : t('howItWorks.faq1ALoading') },
    { q: t('howItWorks.faq2Q'), a: t('howItWorks.faq2A') },
    { q: t('howItWorks.faq3Q'), a: t('howItWorks.faq3A') },
    { q: t('howItWorks.faq4Q'), a: t('howItWorks.faq4A') },
    { q: t('howItWorks.faq5Q'), a: t('howItWorks.faq5A') },
    { q: t('howItWorks.faq6Q'), a: t('howItWorks.faq6A') },
    { q: t('howItWorks.faq7Q'), a: t('howItWorks.faq7A') },
    { q: t('howItWorks.faq8Q'), a: t('howItWorks.faq8A') },
    { q: t('howItWorks.faq9Q'), a: t('howItWorks.faq9A') },
    { q: t('howItWorks.faq10Q'), a: t('howItWorks.faq10A') },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">{t('howItWorks.badge')}</span>
          <h1 className="font-heading text-4xl font-bold text-navy mb-4">{t('howItWorks.title')}</h1>
          <p className="text-muted text-lg max-w-xl mx-auto">{t('howItWorks.subtitle')}</p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link to={lp('/register')} className="bg-primary hover:bg-[#574BFF] text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm shadow-primary/20 text-sm">
              {t('howItWorks.createEvent')}
            </Link>
            <Link to={lp('/login')} className="border border-gray-200 text-navy hover:border-primary hover:text-primary font-medium px-6 py-3 rounded-xl transition text-sm">
              {t('howItWorks.signIn')}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="font-heading text-2xl font-bold text-navy mb-8">{t('howItWorks.gettingStarted')}</h2>
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

      <div className="max-w-3xl mx-auto px-4 pb-14">
        <div className="bg-primary/[0.06] border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <QrCode size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{t('howItWorks.doorTitle')}</h3>
            <p className="text-muted text-sm leading-relaxed">{t('howItWorks.doorDesc')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="font-heading text-2xl font-bold text-navy mb-6">{t('howItWorks.faqTitle')}</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 px-5">
          {FAQS.map(({ q, a }, i) => <FaqItem key={i} q={q} a={a} />)}
        </div>
        <div className="mt-8 text-center">
          <p className="text-muted text-sm">
            {t('howItWorks.contact')}{' '}
            <a href="mailto:support@tiklo.ca" className="text-primary font-medium hover:underline">
              {t('howItWorks.contactLink')}
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
