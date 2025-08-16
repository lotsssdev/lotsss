"use client"

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/ui/turnstile'
import { signup, type SignupState } from '@/app/signup/actions'

function SubmitButton() {
  const t = useTranslations('auth.signup')
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? '…' : t('submit')}
    </Button>
  )
}

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const [state, formAction] = useActionState<SignupState, FormData>(signup, {})
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
                <Label htmlFor="full_name">{t('full_name')}</Label>
                <Input id="full_name" name="full_name" type="text" placeholder={t('full_name')} autoComplete="name" required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">{t('password')}</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" required />
              </div>
              {state?.error && (
                <p className="text-sm text-destructive" role="alert">{state.error}</p>
              )}
              <Turnstile 
                onVerify={(token) => console.log('Signup Turnstile verified:', token)}
                onError={() => console.log('Signup Turnstile error')}
                onExpire={() => console.log('Signup Turnstile expired')}
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
