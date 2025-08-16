"use server"

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function emptyToNull(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null
}

export async function createUser(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()
  const full_name = String(formData.get('full_name') || '').trim() || null
  const username = String(formData.get('username') || '').trim() || null
  const bio = String(formData.get('bio') || '').trim() || null
  const website = String(formData.get('website') || '').trim() || null
  const avatar_url = String(formData.get('avatar_url') || '').trim() || null
  const company_id = String(formData.get('company_id') || '').trim() || null
  const role = String(formData.get('role') || 'member').trim()
  const locale = String(formData.get('locale') || 'pt')

  if (!email) {
    return { error: 'Email é obrigatório.' }
  }

  if (!password || password.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres.' }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Email inválido.' }
  }

  // Website validation if provided
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    return { errors: { website: 'Website deve começar com http:// ou https://' } }
  }

  const supabase = await createClient()
  
  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return { error: 'Email já está em uso.' }
  }

  // Check if username already exists (if provided)
  if (username) {
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return { errors: { username: 'Username já está em uso.' } }
    }
  }

  // Create a service role client to avoid affecting current session
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This requires service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Create auth user using service role client
  const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email: email,
    password: password, // Use password from form
    email_confirm: true, // Skip email confirmation
    user_metadata: {
      full_name: full_name,
    }
  })

  if (authError || !authUser.user) {
    return { error: authError?.message || 'Erro ao criar usuário de autenticação.' }
  }

  // Create the profile using the service client to avoid session issues
  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email: email,
      full_name: full_name,
      username: username,
      bio: bio,
      website: website,
      avatar_url: avatar_url,
    })

  // If insert fails (maybe trigger already created it), try update
  if (profileError) {
    const { error } = await serviceSupabase
      .from('profiles')
      .update({
        full_name: full_name,
        username: username,
        bio: bio,
        website: website,
        avatar_url: avatar_url,
      })
      .eq('id', authUser.user.id)
    
    if (error) {
      return { error: `Erro ao criar perfil: ${error.message}` }
    }
  }

  // Add user to organization if company was selected
  if (company_id) {
    const { error: membershipError } = await serviceSupabase
      .from('organization_members')
      .insert({
        organization_id: company_id,
        user_id: authUser.user.id,
        role: role,
      })

    if (membershipError) {
      return { error: `Usuário criado, mas erro ao vincular à empresa: ${membershipError.message}` }
    }
  }

  revalidatePath(`/${locale}/admin/users`)
  return { ok: true }
}

export async function updateUser(formData: FormData) {
  const id = String(formData.get('id') || '').trim()
  const email = emptyToNull(String(formData.get('email') || ''))
  const password = String(formData.get('password') || '').trim()
  const full_name = emptyToNull(String(formData.get('full_name') || ''))
  const username = emptyToNull(String(formData.get('username') || ''))
  const bio = emptyToNull(String(formData.get('bio') || ''))
  const website = emptyToNull(String(formData.get('website') || ''))
  const avatar_url = emptyToNull(String(formData.get('avatar_url') || ''))
  const company_id = String(formData.get('company_id') || '').trim() || null
  const role = String(formData.get('role') || 'member').trim()
  const locale = String(formData.get('locale') || 'pt')

  if (!id || !email) return { error: 'ID e email são obrigatórios.' }

  // Validate password if provided
  if (password && password.length < 6) {
    return { errors: { password: 'Senha deve ter pelo menos 6 caracteres.' } }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { errors: { email: 'Email inválido.' } }
  }

  // Website validation if provided
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    return { errors: { website: 'Website deve começar com http:// ou https://' } }
  }

  const supabase = await createClient()
  
  // Check if email is already used by another user
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .neq('id', id)
    .single()

  if (existingUser) {
    return { errors: { email: 'Email já está em uso por outro usuário.' } }
  }

  // Check if username is already used by another user (if provided)
  if (username) {
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .single()

    if (existingUsername) {
      return { errors: { username: 'Username já está em uso por outro usuário.' } }
    }
  }

  // Update password if provided
  if (password) {
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { error: passwordError } = await serviceSupabase.auth.admin.updateUserById(id, {
      password: password
    })

    if (passwordError) {
      return { errors: { password: passwordError.message } }
    }
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({
      email: email,
      full_name: full_name,
      username: username,
      bio: bio,
      website: website,
      avatar_url: avatar_url,
    })
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }

  // Handle organization membership
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Remove existing memberships
  await serviceSupabase
    .from('organization_members')
    .delete()
    .eq('user_id', id)

  // Add new membership if company was selected
  if (company_id) {
    const { error: membershipError } = await serviceSupabase
      .from('organization_members')
      .insert({
        organization_id: company_id,
        user_id: id,
        role: role,
      })

    if (membershipError) {
      return { error: `Usuário atualizado, mas erro ao vincular à empresa: ${membershipError.message}` }
    }
  }

  revalidatePath(`/${locale}/admin/users`)
  return { ok: true }
}

export async function deleteUsers(formData: FormData) {
  const idsRaw = String(formData.get('ids') || '')
  const locale = String(formData.get('locale') || 'pt')
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean)

  if (ids.length === 0) return { error: 'Nenhum usuário selecionado.' }

  // Create service role client for admin operations
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Delete users from auth (this will cascade to profiles if FK is set up correctly)
  let hasErrors = false
  const errors: string[] = []

  for (const id of ids) {
    const { error } = await serviceSupabase.auth.admin.deleteUser(id)
    if (error) {
      hasErrors = true
      errors.push(`Erro ao deletar usuário ${id}: ${error.message}`)
    }
  }

  if (hasErrors) {
    return { error: errors.join('; ') }
  }

  revalidatePath(`/${locale}/admin/users`)
  return { ok: true }
}