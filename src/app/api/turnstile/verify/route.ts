import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY not found in environment variables')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get client IP for additional security
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1'

    // Validate token with Cloudflare Turnstile API
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)
    formData.append('remoteip', ip)

    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    )

    const verifyResult = await verifyResponse.json()
    
    console.log('Turnstile API Response:', {
      success: verifyResult.success,
      errorCodes: verifyResult['error-codes'],
      hostname: verifyResult.hostname,
      action: verifyResult.action
    })

    if (verifyResult.success) {
      console.log('✅ Turnstile verification successful')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Turnstile verification failed:', verifyResult)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verification failed',
          details: verifyResult['error-codes'] || []
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}