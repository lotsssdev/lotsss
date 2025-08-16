"use client"

import { useEffect, useRef } from 'react'

interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

export function Turnstile({ onVerify, onError, onExpire, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef({ onVerify, onError, onExpire })
  const widgetIdRef = useRef<string | null>(null)

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onVerify, onError, onExpire }
  }, [onVerify, onError, onExpire])

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) {
      console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY not found')
      return
    }

    // Create global callback functions that Turnstile can access
    const callbackId = Math.random().toString(36).substring(7)
    const successCallback = `turnstileSuccess_${callbackId}`
    const errorCallback = `turnstileError_${callbackId}`
    const expiredCallback = `turnstileExpired_${callbackId}`

    // Set global callback functions
    ;(window as unknown as Record<string, unknown>)[successCallback] = (token: string) => {
      callbacksRef.current.onVerify(token)
    }
    ;(window as unknown as Record<string, unknown>)[errorCallback] = () => {
      callbacksRef.current.onError?.()
    }
    ;(window as unknown as Record<string, unknown>)[expiredCallback] = () => {
      callbacksRef.current.onExpire?.()
    }

    const setupTurnstile = () => {
      if (!containerRef.current) return

      const turnstile = (window as unknown as Record<string, unknown>).turnstile as {
        render: (element: HTMLElement, options: Record<string, unknown>) => string
        remove: (widgetId: string) => void
      }

      // Remove existing widget if any
      if (widgetIdRef.current && turnstile?.remove) {
        try {
          turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        } catch (e) {
          console.log('Widget removal failed (might not exist)')
        }
      }

      // Clear container
      containerRef.current.innerHTML = ''
      containerRef.current.className = className || ''

      // Render new widget explicitly
      if (turnstile?.render) {
        console.log('🔄 Rendering new Turnstile widget')
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          size: 'normal',
          callback: successCallback,
          'error-callback': errorCallback,
          'expired-callback': expiredCallback,
        })
        console.log('✅ Turnstile widget created with ID:', widgetIdRef.current)
      }
    }

    // Load script only once
    if (!document.querySelector('script[src*="turnstile"]')) {
      console.log('📦 Loading Turnstile script')
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.onload = setupTurnstile
      document.head.appendChild(script)
    } else {
      // Script already loaded, setup immediately
      setupTurnstile()
    }

    // Cleanup function
    return () => {
      // Remove widget
      const turnstile = (window as unknown as Record<string, unknown>).turnstile as {
        remove: (widgetId: string) => void
      }
      
      if (widgetIdRef.current && turnstile?.remove) {
        try {
          turnstile.remove(widgetIdRef.current)
        } catch (e) {
          console.log('Widget cleanup failed')
        }
      }

      // Remove global callbacks
      delete (window as unknown as Record<string, unknown>)[successCallback]
      delete (window as unknown as Record<string, unknown>)[errorCallback] 
      delete (window as unknown as Record<string, unknown>)[expiredCallback]
    }
  }, [className])

  return <div ref={containerRef} className={className} />
}