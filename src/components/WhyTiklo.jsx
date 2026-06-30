import { useTranslation } from 'react-i18next'
import { Ticket, ScanLine, CreditCard, BellRing, BarChart3, BadgeDollarSign } from 'lucide-react'

const FEATURE_ICONS = [Ticket, ScanLine, CreditCard, BellRing, BarChart3, BadgeDollarSign]
const FEATURE_COLORS = [
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-cyan-50 text-cyan-600 border-cyan-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100',
  'bg-amber-50 text-amber-600 border-amber-100',
  'bg-rose-50 text-rose-600 border-rose-100',
  'bg-green-50 text-green-600 border-green-100',
]

export default function WhyTiklo() {
  const { t } = useTranslation()

  const features = [1, 2, 3, 4, 5, 6].map((n, i) => ({
    icon: FEATURE_ICONS[i],
    label: t(`why.feature${n}Label`),
    desc: t(`why.feature${n}Desc`),
    color: FEATURE_COLORS[i],
  }))

  return (
    <section className="bg-white border-t border-[#E3E8EE] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">{t('why.sectionLabel')}</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-navy mt-2">{t('why.title')}</h2>
          <p className="text-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">{t('why.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {features.map(({ icon: Icon, label, desc, color }) => (
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
