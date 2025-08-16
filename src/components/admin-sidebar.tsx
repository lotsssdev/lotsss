"use client"

import * as React from "react"
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  GalleryVerticalEnd,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type UIUser = { name: string; email: string; avatar: string }

export function AdminSidebar({
  user,
  orgs,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: UIUser; orgs?: { name: string; role?: string }[] }) {
  const locale = useLocale()
  const t = useTranslations('admin.sidebar')
  const pathname = usePathname()
  const currentUser = user ?? { name: '', email: '', avatar: '' }
  const teamsFromOrgs = orgs?.map((o) => ({
    name: o.name,
    logo: GalleryVerticalEnd,
    plan: o.role ? o.role.charAt(0).toUpperCase() + o.role.slice(1) : 'Member',
  })) ?? []

  const base = `/${locale}/admin`
  const items = [
    { title: t('dashboard'), href: `${base}`, icon: LayoutDashboard },
    { title: t('companies'), href: `${base}/companies`, icon: Building2 },
    { title: t('users'), href: `${base}/users`, icon: Users },
  ]

  // Function to check if current path matches item
  const isActive = (itemHref: string) => {
    if (itemHref === base) {
      // Dashboard is active only on exact match
      return pathname === base
    }
    // Other pages are active if pathname starts with the href
    return pathname.startsWith(itemHref)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamsFromOrgs} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base px-2 py-2">{t('title')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`text-base py-3 ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`}
                      isActive={active}
                    >
                      <a href={item.href}>
                        <item.icon className="h-6 w-6" />
                        <span className="text-base">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

