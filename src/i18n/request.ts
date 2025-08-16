import {getRequestConfig} from 'next-intl/server'
import {routing} from './routing'

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale
  const locale = (routing.locales as readonly string[]).includes(requested as string)
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})
