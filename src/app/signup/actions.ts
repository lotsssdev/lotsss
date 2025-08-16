"use server"

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SignupState = {
  error?: string
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const full_name = String(formData.get('full_name') || '')
  const turnstileToken = String(formData.get('cf-turnstile-response') || '')

  if (!email || !password || !full_name) {
    return { error: 'Please provide name, email and password.' }
  }

  if (!turnstileToken) {
    return { error: 'Verificação de segurança necessária. Tente novamente.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { 
      data: { full_name },
      captchaToken: turnstileToken
    },
  })

  if (error) return { error: error.message }

  redirect('/dashboard')
}
