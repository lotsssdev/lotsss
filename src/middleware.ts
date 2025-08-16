import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'

const locales = ['en', 'es', 'pt'] as const
const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'pt') as (typeof locales)[number]
const AUTH_SEGMENTS = new Set(['login', 'signup', 'forgot-password', 'reset-password'])
const ADMIN_ORG_ID = process.env.ADMIN_ORG_ID || 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always'
})

function isAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  )
}

export async function middleware(request: NextRequest) {
  // Run next-intl middleware first (sets locale header & normalizes path)
  const intlResponse = intlMiddleware(request)
  // If next-intl requested a redirect/rewrite (e.g., add locale prefix), honor it
  if (intlResponse.status !== 200) return intlResponse

  const { supabase, response } = createMiddlewareClient(request)
  const { pathname } = request.nextUrl
  if (isAsset(pathname)) return intlResponse

  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  const hasLocale = (locales as readonly string[]).includes(first || '')
  const locale = (hasLocale ? first : DEFAULT_LOCALE) as (typeof locales)[number]
  const routeSegments = hasLocale ? segments.slice(1) : segments
  const rest = '/' + routeSegments.join('/')
  const isAuthRoute = AUTH_SEGMENTS.has(routeSegments[0] || '')
  const isAdminRoute = (routeSegments[0] || '') === 'admin'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isAuthRoute) {
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (rest === '/' || isAuthRoute)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  // Admin guard: only users from ADMIN_ORG_ID can access /admin
  if (user && isAdminRoute) {
    const orgId = (user.user_metadata as { org_id?: string })?.org_id || (user.app_metadata as { org_id?: string })?.org_id
    if (!orgId || orgId !== ADMIN_ORG_ID) {
      return NextResponse.redirect(new URL(`/${locale}/forbidden`, request.url))
    }
  }

  // Merge next-intl response headers into Supabase response so both effects apply
  intlResponse.headers.forEach((value, key) => response.headers.set(key, value))
  return response
}

export const config = {
  matcher: [
    // Run on all paths except for static files and API routes
    '/((?!api|_next|.*\\..*).*)',
  ],
}
