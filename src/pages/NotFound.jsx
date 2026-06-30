import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLangPath } from '../hooks/useLangPath'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFound() {
  const { t } = useTranslation()
  const lp = useLangPath()
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-heading font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-navy mb-2">{t('notFound.title')}</h1>
        <p className="text-muted mb-8">{t('notFound.desc')}</p>
        <Link to={lp('/')} className="bg-primary hover:bg-[#574BFF] text-white font-semibold px-6 py-2.5 rounded-xl transition">
          {t('notFound.back')}
        </Link>
      </div>
      <Footer />
    </div>
  )
}
