import { useTranslation } from '../i18n/LanguageContext'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-gray-900 text-gray-400 text-xs text-center py-6 px-4 space-y-1">
      <p>{t('footer_disclaimer')}</p>
      <p className="text-gray-500">{t('footer_copy')}</p>
    </footer>
  )
}
