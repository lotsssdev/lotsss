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

    // Update the div with Turnstile data attributes
    if (containerRef.current) {
      containerRef.current.className = `cf-turnstile ${className || ''}`
      containerRef.current.setAttribute('data-sitekey', siteKey)
      containerRef.current.setAttribute('data-theme', 'auto')
      containerRef.current.setAttribute('data-size', 'normal')
      containerRef.current.setAttribute('data-callback', successCallback)
      containerRef.current.setAttribute('data-error-callback', errorCallback)
      containerRef.current.setAttribute('data-expired-callback', expiredCallback)
    }

    // Load script only once using implicit rendering
    if (!document.querySelector('script[src*="turnstile"]')) {
      console.log('📦 Loading Turnstile script with implicit rendering')
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Cleanup function
    return () => {
      // Remove global callbacks
      delete (window as unknown as Record<string, unknown>)[successCallback]
      delete (window as unknown as Record<string, unknown>)[errorCallback] 
      delete (window as unknown as Record<string, unknown>)[expiredCallback]
    }
  }, [className]) // Include className in dependencies

  return <div ref={containerRef} className={className} />
}