"use server"

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function parseIsActive(v: string | null | undefined): boolean {
  const s = String(v ?? 'true').toLowerCase()
  return s === 'true' || s === 'on' || s === '1'
}

type AddrError = { field: 'address_country' | 'address_state' | 'address_zip'; message: string }

function validateAddress(country: string | null, state: string | null, zip: string | null): AddrError | null {
  if (!country) return null
  const c = country.toUpperCase()
  if (c !== 'BR' && c !== 'US') return { field: 'address_country', message: 'País inválido. Selecione Brasil (BR) ou EUA (US).' }
  if (state) {
    if (!/^[A-Za-z]{2}$/.test(state)) return { field: 'address_state', message: 'Estado deve ter 2 letras (UF).' }
  }
  if (zip) {
    if (c === 'BR' && !/^\d{5}-?\d{3}$/.test(zip)) return { field: 'address_zip', message: 'CEP inválido. Use 00000-000.' }
    if (c === 'US' && !/^\d{5}(?:-\d{4})?$/.test(zip)) return { field: 'address_zip', message: 'ZIP code inválido. Use 00000 ou 00000-0000.' }
  }
  return null
}

export async function createCompany(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim() || null
  const legal_name = String(formData.get('legal_name') || '').trim() || null
  const is_active = parseIsActive(formData.get('is_active') as string | null)
  const tax_id = String(formData.get('tax_id') || '').trim() || null
  const address_country = (String(formData.get('address_country') || '').trim() || '').toUpperCase() || null
  const address_street = String(formData.get('address_street') || '').trim() || null
  const address_city = String(formData.get('address_city') || '').trim() || null
  const address_state = (String(formData.get('address_state') || '').trim() || '').toUpperCase() || null
  const address_zip = String(formData.get('address_zip') || '').trim() || null
  const contact_phone = String(formData.get('contact_phone') || '').trim() || null
  const stripe_customer_id = String(formData.get('stripe_customer_id') || '').trim() || null
  const locale = String(formData.get('locale') || 'pt')

  if (!name) {
    return { error: 'Informe o nome.' }
  }

  const addrErr = validateAddress(address_country, address_state, address_zip)
  if (addrErr) return { errors: { [addrErr.field]: addrErr.message } }

  const supabase = await createClient()
  const base = slugify(legal_name || name)
  let attempt = 0
  let lastError: string | null = null
  while (attempt < 6) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const { error } = await supabase.rpc('create_organization', {
      p_name: name,
      p_slug: candidate,
      p_logo_url: null,
      p_description: description,
      p_legal_name: legal_name,
      p_is_active: is_active,
      p_tax_id: tax_id,
      p_address_country: address_country,
      p_address_street: address_street,
      p_address_city: address_city,
      p_address_state: address_state,
      p_address_zip: address_zip,
      p_contact_phone: contact_phone,
      p_stripe_customer_id: stripe_customer_id,
    })
    if (!error) {
      lastError = null
      break
    }
    lastError = error.message || String(error)
    // If duplicate slug, try next candidate; otherwise, abort
    if (!/duplicate|already exists|unique/i.test(lastError)) {
      break
    }
    attempt += 1
  }
  if (lastError) return { error: lastError }

  revalidatePath(`/${locale}/admin/companies`)
  return { ok: true }
}

// Helper to convert empty strings to null (for COALESCE to work properly)
function emptyToNull(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null
}

export async function updateCompany(formData: FormData) {
  const id = String(formData.get('id') || '').trim()
  const name = emptyToNull(String(formData.get('name') || ''))
  const description = emptyToNull(String(formData.get('description') || ''))
  const legal_name = emptyToNull(String(formData.get('legal_name') || ''))
  const is_active = parseIsActive(String(formData.get('is_active') || ''))
  const tax_id = emptyToNull(String(formData.get('tax_id') || ''))
  const address_country = emptyToNull(String(formData.get('address_country') || '').toUpperCase())
  const address_street = emptyToNull(String(formData.get('address_street') || ''))
  const address_city = emptyToNull(String(formData.get('address_city') || ''))
  const address_state = emptyToNull(String(formData.get('address_state') || '').toUpperCase())
  const address_zip = emptyToNull(String(formData.get('address_zip') || ''))
  const contact_phone = emptyToNull(String(formData.get('contact_phone') || ''))
  const stripe_customer_id = emptyToNull(String(formData.get('stripe_customer_id') || ''))
  const locale = String(formData.get('locale') || 'pt')

  if (!id || !name) return { error: 'ID e nome são obrigatórios.' }
  const addrErr = validateAddress(address_country, address_state, address_zip)
  if (addrErr) return { errors: { [addrErr.field]: addrErr.message } }

  const supabase = await createClient()
  
  const { error } = await supabase.rpc('admin_update_organization', {
    p_id: id,
    p_name: name,
    p_description: description,
    p_legal_name: legal_name,
    p_is_active: is_active,
    p_tax_id: tax_id,
    p_address_country: address_country,
    p_address_street: address_street,
    p_address_city: address_city,
    p_address_state: address_state,
    p_address_zip: address_zip,
    p_contact_phone: contact_phone,
    p_stripe_customer_id: stripe_customer_id,
  })
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/${locale}/admin/companies`)
  return { ok: true }
}

export async function deleteCompanies(formData: FormData) {
  const idsRaw = String(formData.get('ids') || '')
  const locale = String(formData.get('locale') || 'pt')
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean)

  if (ids.length === 0) return { error: 'Nenhuma empresa selecionada.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_organizations', { p_ids: ids })
  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/companies`)
  return { ok: true }
}
