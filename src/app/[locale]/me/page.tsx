import { createClient } from '@/lib/supabase/server'

export default async function MePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  const adminOrgId = process.env.ADMIN_ORG_ID || 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'
  const user = data?.user || null
  const userOrgId = (user?.user_metadata as { org_id?: string })?.org_id || (user?.app_metadata as { org_id?: string })?.org_id || null
  const isAuthorized = !!user && userOrgId === adminOrgId

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Me (diagnostics)</h1>
      {!user && (
        <p className="text-destructive">No authenticated user.</p>
      )}
      {error && (
        <p className="text-destructive">Error: {String(error.message || error)}</p>
      )}
      <div className="mt-4 grid gap-3">
        <div>
          <div className="font-medium">ADMIN_ORG_ID</div>
          <pre className="bg-muted p-3 rounded text-sm">{adminOrgId}</pre>
        </div>
        <div>
          <div className="font-medium">Resolved user org_id</div>
          <pre className="bg-muted p-3 rounded text-sm">{String(userOrgId)}</pre>
        </div>
        <div>
          <div className="font-medium">Authorized for /admin?</div>
          <pre className="bg-muted p-3 rounded text-sm">{String(isAuthorized)}</pre>
        </div>
        <div>
          <div className="font-medium">User</div>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}

