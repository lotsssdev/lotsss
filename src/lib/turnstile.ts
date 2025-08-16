export async function verifyTurnstile(token: string): Promise<boolean> {
  console.log('🎯 verifyTurnstile called with token:', token ? `${token.substring(0, 20)}...` : 'empty')
  
  if (!token) {
    console.log('❌ No token provided')
    return false
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/turnstile/verify`
    console.log('🌐 Making request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()
    console.log('📡 API Response:', { status: response.status, data })
    
    if (!response.ok) {
      console.error('❌ Turnstile verification failed:', data)
      return false
    }

    const isValid = data.success === true
    console.log('✅ Final verification result:', isValid)
    return isValid
  } catch (error) {
    console.error('💥 Turnstile verification error:', error)
    return false
  }
}