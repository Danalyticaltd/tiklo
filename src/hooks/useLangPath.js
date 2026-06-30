import { useTranslation } from 'react-i18next'

export function useLangPath() {
  const { i18n } = useTranslation()
  return (path) => {
    if (i18n.language === 'fr') {
      return path === '/' ? '/fr' : `/fr${path}`
    }
    return path
  }
}
