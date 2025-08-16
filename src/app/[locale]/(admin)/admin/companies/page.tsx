import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin-sidebar'
import { CompaniesTable } from '@/components/admin/companies-table'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/common/theme-toggle'
import { LanguageSelector } from '@/components/common/language-selector'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function CompaniesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
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

  const { data: companies, error: errPage } = await supabase.rpc('admin_list_organizations_page', { p_search: q || null, p_limit: per, p_offset: offset })
  let companiesData = companies
  let { data: totalCount } = await supabase.rpc('admin_count_organizations', { p_search: q || null })
  if (errPage || !companiesData) {
    // Fallback to non-paginated RPC if pagination functions are not yet available
    const fallback = await supabase.rpc('admin_list_organizations')
    companiesData = fallback.data as unknown[] | null
    totalCount = fallback.data ? (fallback.data as unknown[]).length : 0
  }

  const list = (companiesData as { [key: string]: unknown }[])?.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    owner_email: (c.owner_email as string) ?? null,
    created_at: c.created_at as string,
    is_active: (c.is_active as boolean) ?? true,
    address_country: (c.address_country as string) ?? null,
    address_street: (c.address_street as string) ?? null,
    address_city: (c.address_city as string) ?? null,
    address_state: (c.address_state as string) ?? null,
    address_zip: (c.address_zip as string) ?? null,
    contact_phone: (c.contact_phone as string) ?? null,
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
          <CompaniesTable companies={list} total={Number(totalCount ?? 0)} page={page} per={per} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
