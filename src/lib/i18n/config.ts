import type { Language } from '@/types/i18n.types'

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'pt']
export const DEFAULT_LANGUAGE: Language = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as Language) || 'en'

export function isSupportedLanguage(lang: string | null | undefined): lang is Language {
  return !!lang && (SUPPORTED_LANGUAGES as string[]).includes(lang)
}

export function sanitizeLanguage(lang: string | null | undefined): Language {
  if (isSupportedLanguage(lang)) return lang
  return DEFAULT_LANGUAGE
}

export function getBrowserLanguage(): Language {
  if (typeof navigator !== 'undefined') {
    const base = navigator.language?.split('-')[0]
    return sanitizeLanguage(base)
  }
  return DEFAULT_LANGUAGE
}
