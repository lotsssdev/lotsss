"use server"

import { createClient } from '@/lib/supabase/server'

export type ForgotState = {
  error?: string
  success?: string
}

export async function sendReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get('email') || '')
  if (!email) return { error: 'Please provide your email.' }

  const supabase = await createClient()

  // URL de redirecionamento após o link de reset. Ajuste se quiser outra página.
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { error: error.message }

  return { success: 'We sent an email with instructions to reset your password.' }
}
