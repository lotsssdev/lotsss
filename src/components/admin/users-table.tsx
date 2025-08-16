"use client"

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createUser, deleteUsers, updateUser } from '@/app/admin/users/actions'

type User = {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
  updated_at: string
  organizations: Array<{
    id: string
    name: string
    role: string
  }>
}

type Company = {
  id: string
  name: string
}

export function UsersTable({ users, companies, total, page, per }: { 
  users: User[]
  companies: Company[]
  total: number
  page: number
  per: number 
}) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({})
  const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({})
  const locale = useLocale()
  const t = useTranslations('admin.users')
  const router = useRouter()
  const sp = useSearchParams()
  const searchParams = new URLSearchParams(sp?.toString() ?? '')
  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
  const singleSelected = selectedIds.length === 1
  const getEditErr = (k: string) => editErrors[k]
  const getCreateErr = (k: string) => createErrors[k]

  const allSelected = users.length > 0 && users.every((u) => selected[u.id])
  const anySelected = users.some((u) => selected[u.id])
  const totalPages = Math.max(Math.ceil((total || 0) / (per || 1)), 1)

  async function onCreate(formData: FormData) {
    setCreating(true)
    setCreateErrors({})
    formData.set('locale', locale)
    const res = await createUser(formData)
    setCreating(false)
    
    if ((res as { errors?: Record<string, string>; error?: string })?.errors || (res as { error?: string })?.error) {
      const errs = (res as { errors?: Record<string, string> }).errors || {}
      if (!(Object.keys(errs).length)) (errs as Record<string, string>)._form = (res as { error?: string }).error || ''
      setCreateErrors(errs)
      return
    }
    
    setCreateErrors({})
    setCreateOpen(false)
    router.refresh()
  }

  async function onDeleteConfirm() {
    setDeleting(true)
    const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
    const fd = new FormData()
    fd.set('ids', ids.join(','))
    fd.set('locale', locale)
    const res = await deleteUsers(fd)
    setDeleting(false)
    if ((res as { error?: string })?.error) {
      alert((res as { error: string }).error)
      return
    }
    setSelected({})
    router.refresh()
  }

  function setQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    router.push(`?${params.toString()}`)
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery({ q: e.target.value, page: '1' })
  }

  // Reset create form when create modal closes
  React.useEffect(() => {
    if (!createOpen) {
      setCreateErrors({})
    }
  }, [createOpen])

  async function onUpdate(fd: FormData) {
    setUpdating(true)
    setEditErrors({})
    
    fd.set('locale', locale)
    const res = await updateUser(fd)
    
    setUpdating(false)
    
    if ((res as { errors?: Record<string, string>; error?: string })?.errors || (res as { error?: string })?.error) {
      const errs = (res as { errors?: Record<string, string> }).errors || {}
      if (!(Object.keys(errs).length)) (errs as Record<string, string>)._form = (res as { error?: string }).error || ''
      setEditErrors(errs)
      return
    }
    setEditErrors({})
    setEditId(null)
    router.refresh()
  }

  function getInitials(name: string | null, email: string) {
    if (name && name.trim()) {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.charAt(0).toUpperCase()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <Input placeholder={t('search')} defaultValue={sp?.get('q') ?? ''} onChange={onSearchChange} />
        </div>
        <div className="flex items-center gap-2">
          {anySelected && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="size-4 mr-2" /> {t('delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Os usuários selecionados serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteConfirm} disabled={deleting}>
                    {deleting ? t('deleting') : t('delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {singleSelected && (
            <Button variant="outline" size="sm" onClick={() => setEditId(selectedIds[0])}>{t('edit')}</Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('newUser')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => {
                    if (typeof v === 'boolean') {
                      const map: Record<string, boolean> = {}
                      if (v) users.forEach((u) => (map[u.id] = true))
                      setSelected(map)
                    }
                  }}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>{t('columns.user')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.username')}</TableHead>
              <TableHead>{t('columns.company')}</TableHead>
              <TableHead>{t('columns.website')}</TableHead>
              <TableHead>{t('columns.createdAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox
                    checked={!!selected[user.id]}
                    onCheckedChange={(v) => {
                      if (typeof v === 'boolean') setSelected((s) => ({ ...s, [user.id]: v }))
                    }}
                    aria-label={`Selecionar ${user.full_name || user.email}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ''} alt={user.full_name || user.email} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.full_name || '—'}</span>
                      {user.bio && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {user.bio}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{user.email}</TableCell>
                <TableCell>
                  {user.username ? (
                    <Badge variant="secondary">@{user.username}</Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {user.organizations.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {user.organizations.map((org) => (
                        <div key={org.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {org.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {org.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sem empresa</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.website ? (
                    <a 
                      href={user.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t('noUsers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <span>
              {Math.min((page - 1) * per + 1, total)}–{Math.min(page * per, total)} {t('pagination.of')} {total}
            </span>
          ) : (
            <span>0 {t('pagination.results')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setQuery({ page: String(page - 1) })}>
            {t('pagination.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('pagination.page')} {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setQuery({ page: String(page + 1) })}>
            {t('pagination.next')}
          </Button>
        </div>
      </div>

      {(() => {
        const user = users.find((x) => x.id === editId)
        if (!editId || !user) return null
        return (
          <Sheet open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
            <SheetContent side="right" className="flex h-full flex-col p-0 sm:max-w-2xl">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>{t('editTitle')}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-scroll p-6 [scrollbar-gutter:stable]">
                <form action={onUpdate} className="grid gap-4">
                  <input type="hidden" name="id" value={user.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="email_edit">{t('form.email')}</Label>
                    <Input 
                      id="email_edit" 
                      name="email" 
                      type="email"
                      defaultValue={user.email} 
                      required 
                      className={getEditErr('email') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('email') && <p className="text-destructive text-sm">{getEditErr('email')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password_edit">{t('form.password')}</Label>
                    <Input 
                      id="password_edit" 
                      name="password" 
                      type="password"
                      placeholder="Deixe em branco para manter a senha atual"
                      className={getEditErr('password') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    <p className="text-xs text-muted-foreground">Deixe vazio se não quiser alterar a senha</p>
                    {getEditErr('password') && <p className="text-destructive text-sm">{getEditErr('password')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name_edit">{t('form.fullName')}</Label>
                    <Input 
                      id="full_name_edit" 
                      name="full_name" 
                      defaultValue={user.full_name ?? ''} 
                      className={getEditErr('full_name') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('full_name') && <p className="text-destructive text-sm">{getEditErr('full_name')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username_edit">{t('form.username')}</Label>
                    <Input 
                      id="username_edit" 
                      name="username" 
                      defaultValue={user.username ?? ''} 
                      placeholder="johndoe"
                      className={getEditErr('username') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('username') && <p className="text-destructive text-sm">{getEditErr('username')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bio_edit">{t('form.bio')}</Label>
                    <Textarea 
                      id="bio_edit" 
                      name="bio" 
                      defaultValue={user.bio ?? ''} 
                      rows={3}
                      className={getEditErr('bio') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('bio') && <p className="text-destructive text-sm">{getEditErr('bio')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website_edit">{t('form.website')}</Label>
                    <Input 
                      id="website_edit" 
                      name="website" 
                      type="url"
                      defaultValue={user.website ?? ''} 
                      placeholder="https://example.com"
                      className={getEditErr('website') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('website') && <p className="text-destructive text-sm">{getEditErr('website')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="avatar_url_edit">{t('form.avatarUrl')}</Label>
                    <Input 
                      id="avatar_url_edit" 
                      name="avatar_url" 
                      type="url"
                      defaultValue={user.avatar_url ?? ''} 
                      placeholder="https://example.com/avatar.jpg"
                      className={getEditErr('avatar_url') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                    />
                    {getEditErr('avatar_url') && <p className="text-destructive text-sm">{getEditErr('avatar_url')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company_edit">{t('form.company')}</Label>
                    <select 
                      id="company_edit" 
                      name="company_id" 
                      defaultValue={user.organizations[0]?.id || ""}
                      className={`h-10 rounded-md border bg-muted/50 px-3 ${getEditErr('company_id') ? 'border-destructive' : ''}`}
                    >
                      <option value="">{t('form.selectCompany')}</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Deixe vazio para remover da empresa atual</p>
                    {getEditErr('company_id') && <p className="text-destructive text-sm">{getEditErr('company_id')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role_edit">{t('form.role')}</Label>
                    <select 
                      id="role_edit" 
                      name="role" 
                      defaultValue={user.organizations[0]?.role || "member"}
                      className={`h-10 rounded-md border bg-muted/50 px-3 ${getEditErr('role') ? 'border-destructive' : ''}`}
                    >
                      <option value="member">{t('form.memberRole')}</option>
                      <option value="admin">{t('form.adminRole')}</option>
                      <option value="owner">{t('form.ownerRole')}</option>
                    </select>
                    {getEditErr('role') && <p className="text-destructive text-sm">{getEditErr('role')}</p>}
                  </div>
                  {getEditErr('_form') && (
                    <div className="rounded-md bg-destructive/15 p-3">
                      <p className="text-destructive text-sm">{getEditErr('_form')}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditId(null)} disabled={updating}>{t('cancel')}</Button>
                    <Button type="submit" disabled={updating}>
                      {updating ? t('saving') : t('save')}
                    </Button>
                  </div>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        )
      })()}

      {/* Create User Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="flex h-full flex-col p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{t('createTitle')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-scroll p-6 [scrollbar-gutter:stable]">
            <form action={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email_create">{t('form.email')}</Label>
                <Input 
                  id="email_create" 
                  name="email" 
                  type="email"
                  required 
                  className={getCreateErr('email') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('email') && <p className="text-destructive text-sm">{getCreateErr('email')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password_create">{t('form.password')}</Label>
                <Input 
                  id="password_create" 
                  name="password" 
                  type="password"
                  required 
                  defaultValue="temp123456"
                  className={getCreateErr('password') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                <p className="text-xs text-muted-foreground">O usuário pode alterar a senha após o primeiro login</p>
                {getCreateErr('password') && <p className="text-destructive text-sm">{getCreateErr('password')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name_create">{t('form.fullName')}</Label>
                <Input 
                  id="full_name_create" 
                  name="full_name" 
                  placeholder="João Silva"
                  className={getCreateErr('full_name') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('full_name') && <p className="text-destructive text-sm">{getCreateErr('full_name')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username_create">{t('form.username')}</Label>
                <Input 
                  id="username_create" 
                  name="username" 
                  placeholder="joaosilva"
                  className={getCreateErr('username') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('username') && <p className="text-destructive text-sm">{getCreateErr('username')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio_create">{t('form.bio')}</Label>
                <Textarea 
                  id="bio_create" 
                  name="bio" 
                  rows={3}
                  placeholder="Breve descrição sobre o usuário"
                  className={getCreateErr('bio') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('bio') && <p className="text-destructive text-sm">{getCreateErr('bio')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website_create">{t('form.website')}</Label>
                <Input 
                  id="website_create" 
                  name="website" 
                  type="url"
                  placeholder="https://joaosilva.com"
                  className={getCreateErr('website') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('website') && <p className="text-destructive text-sm">{getCreateErr('website')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar_url_create">{t('form.avatarUrl')}</Label>
                <Input 
                  id="avatar_url_create" 
                  name="avatar_url" 
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  className={getCreateErr('avatar_url') ? 'border-destructive focus-visible:ring-destructive' : ''} 
                />
                {getCreateErr('avatar_url') && <p className="text-destructive text-sm">{getCreateErr('avatar_url')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_create">{t('form.company')}</Label>
                <select 
                  id="company_create" 
                  name="company_id" 
                  className={`h-10 rounded-md border bg-muted/50 px-3 ${getCreateErr('company_id') ? 'border-destructive' : ''}`}
                >
                  <option value="">{t('form.selectCompany')}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {getCreateErr('company_id') && <p className="text-destructive text-sm">{getCreateErr('company_id')}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role_create">{t('form.role')}</Label>
                <select 
                  id="role_create" 
                  name="role" 
                  defaultValue="member"
                  className={`h-10 rounded-md border bg-muted/50 px-3 ${getCreateErr('role') ? 'border-destructive' : ''}`}
                >
                  <option value="member">{t('form.memberRole')}</option>
                  <option value="admin">{t('form.adminRole')}</option>
                  <option value="owner">{t('form.ownerRole')}</option>
                </select>
                {getCreateErr('role') && <p className="text-destructive text-sm">{getCreateErr('role')}</p>}
              </div>
              {getCreateErr('_form') && (
                <div className="rounded-md bg-destructive/15 p-3">
                  <p className="text-destructive text-sm">{getCreateErr('_form')}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>{t('cancel')}</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? t('creating') : t('create')}
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}