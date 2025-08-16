"use server"

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error?: string
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const requestedReturnTo = String(formData.get('returnTo') || '')
  const requestedLocale = String(formData.get('locale') || '')

  if (!email || !password) {
    return { error: 'Informe email e senha.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Determine locale from form (set by client), fallback to default
  const allowedLocales = ['en', 'es', 'pt'] as const
  const locale = (allowedLocales as readonly string[]).includes(requestedLocale)
    ? requestedLocale
    : process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'pt'

  // Sanitize returnTo to avoid open redirects and loops
  let target = `/${locale}/dashboard`
  if (
    requestedReturnTo &&
    requestedReturnTo.startsWith('/') &&
    !requestedReturnTo.startsWith('//')
  ) {
    const blockedAuthPaths = /^(\/([a-z]{2}))?\/(login|signup|forgot-password|reset-password)(\/|$)/
    if (!blockedAuthPaths.test(requestedReturnTo)) {
      target = requestedReturnTo
    }
  }

  redirect(target)
}
