import { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')
  const toggle = () => setLang(l => l === 'en' ? 'hi' : 'en')
  const t = key => translations[lang][key] ?? key
  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = () => useContext(LanguageContext)
