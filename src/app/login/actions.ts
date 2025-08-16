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
  const turnstileToken = String(formData.get('cf-turnstile-response') || '')

  console.log('🔐 Login action called with:', {
    email: email ? '***@***' : 'empty',
    hasPassword: !!password,
    turnstileToken: turnstileToken ? `${turnstileToken.substring(0, 20)}...` : 'empty'
  })

  if (!email || !password) {
    return { error: 'Informe email e senha.' }
  }

  if (!turnstileToken) {
    return { error: 'Verificação de segurança necessária. Tente novamente.' }
  }

  console.log('🔑 Attempting Supabase login...')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ 
    email, 
    password,
    options: {
      captchaToken: turnstileToken
    }
  })

  if (error) {
    console.log('❌ Supabase login failed:', error.message)
    return { error: error.message }
  }
  
  console.log('✅ Supabase login successful!')

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
