"use client"

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/ui/turnstile'
import { sendReset, type ForgotState } from '@/app/forgot-password/actions'

function SubmitButton() {
  const t = useTranslations('auth.forgot')
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? '…' : t('submit')}
    </Button>
  )
}

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<'div'>) {
  const t = useTranslations('auth.forgot')
  const locale = useLocale()
  const [state, formAction] = useActionState<ForgotState, FormData>(sendReset, {})
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" required />
              </div>
              {state?.error && (
                <p className="text-sm text-destructive" role="alert">{state.error}</p>
              )}
              {state?.success && (
                <p className="text-sm text-green-600" role="status">{state.success}</p>
              )}
              <Turnstile 
                onVerify={(token) => console.log('Forgot password Turnstile verified:', token)}
                onError={() => console.log('Forgot password Turnstile error')}
                onExpire={() => console.log('Forgot password Turnstile expired')}
                className="flex justify-center"
              />
              <SubmitButton />
              <div className="text-center text-sm">
                {t('cta')} <Link href={`/${locale}/login`} className="underline underline-offset-4">{t('login')}</Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
