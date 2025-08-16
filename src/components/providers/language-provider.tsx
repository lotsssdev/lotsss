"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Language } from '@/types/i18n.types'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, sanitizeLanguage, getBrowserLanguage } from '@/lib/i18n/config'

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    try {
      // Cookie takes precedence to keep SSR/CSR in sync when present
      const cookieMatch = document.cookie.match(/(?:^|; )lang=([^;]*)/)
      const cookieLang = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
      const saved = sanitizeLanguage(cookieLang || (localStorage.getItem('language') as Language | null))
      const initial = saved || getBrowserLanguage()
      setLanguageState(initial)
    } catch {
      setLanguageState(getBrowserLanguage())
    }
  }, [])

  const setLanguage = (lang: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return
    setLanguageState(lang)
    try {
      localStorage.setItem('language', lang)
      const maxAge = 60 * 60 * 24 * 365 // 1 year
      document.cookie = `lang=${encodeURIComponent(lang)}; Path=/; Max-Age=${maxAge}`
    } catch {
      // ignore storage errors
    }
  }

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
