"use client"

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

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
import { createCompany, deleteCompanies, updateCompany } from '@/app/admin/companies/actions'

type Company = {
  id: string
  name: string
  owner_email: string | null
  created_at: string
  is_active?: boolean
  address_country?: string | null
  address_street?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  contact_phone?: string | null
  legal_name?: string | null
  description?: string | null
  tax_id?: string | null
  stripe_customer_id?: string | null
}

export function CompaniesTable({ companies, total, page, per }: { companies: Company[]; total: number; page: number; per: number }) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)
  const [editCountry, setEditCountry] = React.useState<'BR'|'US'>('BR')
  const [createCountry, setCreateCountry] = React.useState<'BR'|'US'>('BR')
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({})
  const locale = useLocale()
  const t = useTranslations('admin.companies')
  const router = useRouter()
  const sp = useSearchParams()
  const searchParams = new URLSearchParams(sp?.toString() ?? '')
  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
  const singleSelected = selectedIds.length === 1
  const getEditErr = (k: string) => editErrors[k]

  const allSelected = companies.length > 0 && companies.every((c) => selected[c.id])
  const anySelected = companies.some((c) => selected[c.id])
  const totalPages = Math.max(Math.ceil((total || 0) / (per || 1)), 1)

  async function onCreate(formData: FormData) {
    setCreating(true)
    formData.set('locale', locale)
    const res = await createCompany(formData)
    setCreating(false)
    if ((res as { error?: string })?.error) {
      alert((res as { error: string }).error)
      return
    }
    setCreateOpen(false)
    router.refresh()
  }

  async function onDeleteConfirm() {
    setDeleting(true)
    const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
    const fd = new FormData()
    fd.set('ids', ids.join(','))
    fd.set('locale', locale)
    const res = await deleteCompanies(fd)
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

  React.useEffect(() => {
    if (!editId) return
    const c = companies.find((x) => x.id === editId)
    if (c?.address_country === 'US' || c?.address_country === 'BR') {
      setEditCountry(c.address_country)
    } else {
      setEditCountry('BR')
    }
  }, [editId, companies])

  // Reset create form when create modal closes
  React.useEffect(() => {
    if (!createOpen) {
      setCreateCountry('BR')
    }
  }, [createOpen])

  async function onUpdate(fd: FormData) {
    setUpdating(true)
    setEditErrors({}) // Clear previous errors
    
    fd.set('locale', locale)
    const res = await updateCompany(fd)
    
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <div className="flex items-center gap-2 hidden">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!anySelected}>
                <Trash2 className="size-4 mr-2" /> {t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteDescription')}
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
          <Button variant="outline" size="sm" disabled={!singleSelected} onClick={() => singleSelected && setEditId(selectedIds[0])}>Editar</Button>

          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('newCompany')}
          </Button>
        </div>
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
                    Esta ação não pode ser desfeita. As empresas selecionadas serão removidas.
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
            <Plus className="size-4 mr-2" /> {t('newCompany')}
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
                      if (v) companies.forEach((c) => (map[c.id] = true))
                      setSelected(map)
                    }
                  }}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <TableHead>{t('columns.companyName')}</TableHead>
              <TableHead>{t('columns.address')}</TableHead>
              <TableHead>{t('columns.phone')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.createdAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox
                    checked={!!selected[c.id]}
                    onCheckedChange={(v) => {
                      if (typeof v === 'boolean') setSelected((s) => ({ ...s, [c.id]: v }))
                    }}
                    aria-label={`Selecionar ${c.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[
                    c.address_street,
                    [c.address_city, c.address_state].filter(Boolean).join(', '),
                    c.address_zip,
                    c.address_country,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </TableCell>
                <TableCell>{c.contact_phone ?? '—'}</TableCell>
                <TableCell>{c.owner_email ?? '—'}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={c.is_active 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }
                  >
                    {c.is_active ? t('form.active') : t('form.inactive')}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t('noCompanies')}
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
        const company = companies.find((x) => x.id === editId)
        if (!editId || !company) return null
        return (
          <Sheet open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
            <SheetContent side="right" className="flex h-full flex-col p-0 sm:max-w-2xl">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>{t('editTitle')}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-scroll p-6 [scrollbar-gutter:stable]">
                <form action={onUpdate} className="grid gap-4">
                <input type="hidden" name="id" value={company.id} />
                <div className="grid gap-2">
                  <Label htmlFor="name_edit">{t('form.name')}</Label>
                  <Input id="name_edit" name="name" defaultValue={company.name} required className={getEditErr('name') ? 'border-destructive focus-visible:ring-destructive' : ''} />
                  {getEditErr('name') && <p className="text-destructive text-sm">{getEditErr('name')}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="legal_name_edit">{t('form.legalName')}</Label>
                  <Input id="legal_name_edit" name="legal_name" defaultValue={company.legal_name ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description_edit">{t('form.description')}</Label>
                  <Input id="description_edit" name="description" defaultValue={company.description ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="is_active_edit">{t('form.status')}</Label>
                  <select id="is_active_edit" name="is_active" defaultValue={company.is_active ? 'true' : 'false'} className={`h-10 rounded-md border bg-muted/50 px-3 ${getEditErr('is_active') ? 'border-destructive' : ''}`}>
                    <option value="true">{t('form.active')}</option>
                    <option value="false">{t('form.inactive')}</option>
                  </select>
                  {getEditErr('is_active') && <p className="text-destructive text-sm">{getEditErr('is_active')}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax_id_edit">{t('form.taxId')}</Label>
                  <Input id="tax_id_edit" name="tax_id" defaultValue={company.tax_id ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_country_edit">{t('form.country')}</Label>
                  <select id="address_country_edit" name="address_country" defaultValue={company.address_country ?? 'BR'} onChange={(e) => setEditCountry(e.target.value as 'BR'|'US')} className={`h-10 rounded-md border bg-muted/50 px-3 ${getEditErr('address_country') ? 'border-destructive' : ''}`}>
                    <option value="BR">{t('form.brazil')}</option>
                    <option value="US">{t('form.usa')}</option>
                  </select>
                  {getEditErr('address_country') && <p className="text-destructive text-sm">{getEditErr('address_country')}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_street_edit">{t('form.address')}</Label>
                    <Input id="address_street_edit" name="address_street" defaultValue={company.address_street ?? ''} className={getEditErr('address_street') ? 'border-destructive focus-visible:ring-destructive' : ''} />
                    {getEditErr('address_street') && <p className="text-destructive text-sm">{getEditErr('address_street')}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="address_city_edit">{t('form.city')}</Label>
                    <Input id="address_city_edit" name="address_city" defaultValue={company.address_city ?? ''} className={getEditErr('address_city') ? 'border-destructive focus-visible:ring-destructive' : ''} />
                    {getEditErr('address_city') && <p className="text-destructive text-sm">{getEditErr('address_city')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address_state_edit">{t('form.state')}</Label>
                    <select id="address_state_edit" name="address_state" defaultValue={company.address_state ?? ''} className={`h-10 rounded-md border bg-muted/50 px-3 ${getEditErr('address_state') ? 'border-destructive' : ''}`}>
                      <option value="">{t('form.selectState')}</option>
                      {((editCountry || (company.address_country as 'BR'|'US') || 'BR') === 'BR'
                        ? ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
                        : ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
                      ).map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    {getEditErr('address_state') && <p className="text-destructive text-sm">{getEditErr('address_state')}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address_zip_edit">{t('form.zip')}</Label>
                    <Input id="address_zip_edit" name="address_zip" defaultValue={company.address_zip ?? ''} className={getEditErr('address_zip') ? 'border-destructive focus-visible:ring-destructive' : ''} />
                    {getEditErr('address_zip') && <p className="text-destructive text-sm">{getEditErr('address_zip')}</p>}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_phone_edit">{t('form.phone')}</Label>
                  <Input id="contact_phone_edit" name="contact_phone" defaultValue={company.contact_phone ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stripe_customer_id_edit">{t('form.stripeId')}</Label>
                  <Input id="stripe_customer_id_edit" name="stripe_customer_id" defaultValue={company.stripe_customer_id ?? ''} />
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

      {/* Create Company Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="flex h-full flex-col p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{t('createTitle')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-scroll p-6 [scrollbar-gutter:stable]">
            <form action={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name_create">{t('form.name')}</Label>
                <Input id="name_create" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="legal_name_create">{t('form.legalName')}</Label>
                <Input id="legal_name_create" name="legal_name" placeholder="Lotsss Realty LLC" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description_create">{t('form.description')}</Label>
                <Input id="description_create" name="description" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is_active_create">{t('form.status')}</Label>
                <select id="is_active_create" name="is_active" defaultValue="true" className="h-10 rounded-md border bg-muted/50 px-3">
                  <option value="true">Ativa</option>
                  <option value="false">Desativada</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tax_id_create">{t('form.taxId')}</Label>
                <Input id="tax_id_create" name="tax_id" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_country_create">{t('form.country')}</Label>
                <select 
                  id="address_country_create" 
                  name="address_country" 
                  value={createCountry}
                  onChange={(e) => setCreateCountry(e.target.value as 'BR'|'US')}
                  className="h-10 rounded-md border bg-muted/50 px-3"
                >
                  <option value="BR">Brasil</option>
                  <option value="US">EUA</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_street_create">{t('form.address')}</Label>
                <Input id="address_street_create" name="address_street" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="address_city_create">{t('form.city')}</Label>
                  <Input id="address_city_create" name="address_city" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_state_create">{t('form.state')}</Label>
                  <select id="address_state_create" name="address_state" className="h-10 rounded-md border bg-muted/50 px-3">
                    <option value="">{t('form.selectState')}</option>
                    {(createCountry === 'BR'
                      ? ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
                      : ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
                    ).map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_zip_create">{t('form.zip')}</Label>
                  <Input id="address_zip_create" name="address_zip" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_phone_create">{t('form.phone')}</Label>
                <Input id="contact_phone_create" name="contact_phone" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stripe_customer_id_create">{t('form.stripeId')}</Label>
                <Input id="stripe_customer_id_create" name="stripe_customer_id" placeholder="cus_..." />
              </div>
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
