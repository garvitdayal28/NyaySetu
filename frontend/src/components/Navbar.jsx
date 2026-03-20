import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

export default function Navbar() {
  const { t, toggle } = useTranslation()
  const { pathname } = useLocation()

  const links = [
    { to: '/', key: 'nav_home' },
    { to: '/laws', key: 'nav_laws' },
    { to: '/dashboard', key: 'nav_dashboard' },
    { to: '/voice', key: 'nav_voice' },
  ]

  return (
    <nav className="bg-white border-b border-orange-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-orange-700 text-lg tracking-tight">
          न्यायसेतु <span className="text-orange-400 font-normal text-sm">AI</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-4">
          {links.map(({ to, key }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm px-2 py-1 rounded-md transition-colors hidden sm:block
                ${pathname === to
                  ? 'text-orange-700 font-semibold bg-orange-50'
                  : 'text-gray-600 hover:text-orange-600'}`}
            >
              {t(key)}
            </Link>
          ))}

          <button
            onClick={toggle}
            className="ml-2 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-200 transition-colors"
          >
            {t('lang_toggle')}
          </button>
        </div>
      </div>
    </nav>
  )
}
