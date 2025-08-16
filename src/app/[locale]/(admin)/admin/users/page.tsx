import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin-sidebar'
import { UsersTable } from '@/components/admin/users-table'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/common/theme-toggle'
import { LanguageSelector } from '@/components/common/language-selector'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function UsersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let uiUser: { name: string; email: string; avatar: string } | undefined
  let orgs: { name: string; role?: string }[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .single()

    uiUser = {
      name: profile?.full_name || user.email || 'User',
      email: profile?.email || user.email || '',
      avatar: profile?.avatar_url || 'https://github.com/shadcn.png',
    }

    const { data: orgRows } = await supabase.rpc('orgs_for_current_user')
    orgs = (orgRows ?? []).map((o: { name: string; role: string }) => ({ name: o.name as string, role: o.role as string }))
  }

  const sp = (await searchParams) ?? {}
  const q = typeof sp.q === 'string' ? sp.q : ''
  const page = Math.max(parseInt(String(sp.page ?? '1')) || 1, 1)
  const per = Math.max(parseInt(String(sp.per ?? '10')) || 10, 1)
  const offset = (page - 1) * per

  // Get total count first
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .or(`email.ilike.%${q || ''}%,full_name.ilike.%${q || ''}%,username.ilike.%${q || ''}%`)

  // Get paginated users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${q || ''}%,full_name.ilike.%${q || ''}%,username.ilike.%${q || ''}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + per - 1)

  // Get organization memberships for the current page users
  const userIds = users?.map(u => u.id) || []
  const { data: memberships } = userIds.length > 0 ? await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      organizations (
        id,
        name
      )
    `)
    .in('user_id', userIds) : { data: [] }

  // Get all companies for the dropdowns
  const { data: companies } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Create a map of user memberships for fast lookup
  const membershipMap = new Map()
  memberships?.forEach((m) => {
    if (!membershipMap.has(m.user_id)) {
      membershipMap.set(m.user_id, [])
    }
    const org = (m as unknown as { organizations?: { id: string; name: string } }).organizations
    membershipMap.get(m.user_id).push({
      id: org?.id,
      name: org?.name,
      role: m.role,
    })
  })

  const list = (users as { [key: string]: unknown }[])?.map((u) => ({
    id: u.id as string,
    email: u.email as string,
    full_name: (u.full_name as string) ?? null,
    username: (u.username as string) ?? null,
    avatar_url: (u.avatar_url as string) ?? null,
    bio: (u.bio as string) ?? null,
    website: (u.website as string) ?? null,
    created_at: u.created_at as string,
    updated_at: u.updated_at as string,
    organizations: membershipMap.get(u.id) || [], // Get user's organizations
  })) ?? []

  return (
    <SidebarProvider>
      <AdminSidebar user={uiUser} orgs={orgs} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <div className="ml-auto flex items-center gap-2">
              <LanguageSelector />
              <ModeToggle />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <UsersTable 
            users={list} 
            companies={companies || []}
            total={Number(totalCount ?? 0)} 
            page={page} 
            per={per} 
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}