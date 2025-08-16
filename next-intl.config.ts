export default {
  locales: ['en', 'es', 'pt'],
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'pt',
  localePrefix: 'always',
} as const

