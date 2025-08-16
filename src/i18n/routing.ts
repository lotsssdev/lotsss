import {defineRouting} from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pt'],
  defaultLocale: (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as 'en' | 'es' | 'pt') || 'pt'
})

