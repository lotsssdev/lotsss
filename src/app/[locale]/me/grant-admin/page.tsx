import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function getUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, user: data.user }
}

export default async function GrantAdminPage() {
  const adminOrgId = process.env.ADMIN_ORG_ID || 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'
  const { user } = await getUser()

  async function grant() {
    'use server'
    const { supabase } = await getUser()
    const adminOrgId = process.env.ADMIN_ORG_ID || 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'
    await supabase.auth.updateUser({ data: { org_id: adminOrgId } })
    redirect('../me')
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Grant Admin</h1>
        <p className="text-destructive mt-2">You must be logged in.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Grant Admin</h1>
      <p className="text-muted-foreground mt-2">This sets your user_metadata.org_id to the ADMIN_ORG_ID: <code>{adminOrgId}</code></p>
      <form action={grant} className="mt-4">
        <button className="px-4 py-2 rounded bg-primary text-primary-foreground" type="submit">Set org_id</button>
      </form>
    </div>
  )
}

