import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from '@/lib/supabase/server'
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/common/theme-toggle"
import { LanguageSelector } from '@/components/common/language-selector'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default async function AdminPage() {
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
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
