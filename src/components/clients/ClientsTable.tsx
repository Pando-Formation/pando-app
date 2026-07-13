'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2Icon, SearchIcon, MoreHorizontalIcon, ArrowUpDownIcon, PlusIcon, EyeIcon, PencilIcon, ArchiveIcon } from 'lucide-react'
import { CLIENT_STATUS_LABELS } from '@/lib/client-labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { archiveClientAction } from '@/app/(app)/clients/actions'

export type ClientRow = {
  id: string
  companyName: string
  status: string
  isPublicSector: boolean
  siret: string | null
  city: string | null
  contactsCount: number
}

type SortKey = 'name' | 'status' | 'contacts'

function SortableHead({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 font-medium text-foreground"
      >
        {label}
        <ArrowUpDownIcon className={active ? 'opacity-100' : 'opacity-40'} style={{ width: 12, height: 12 }} />
        {active && <span className="sr-only">({direction === 'asc' ? 'croissant' : 'décroissant'})</span>}
      </button>
    </TableHead>
  )
}

export function ClientsTable({ data, canWrite }: { data: ClientRow[]; canWrite: boolean }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? data.filter((c) => `${c.companyName} ${c.siret ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q))
      : data

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.companyName.localeCompare(b.companyName)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else cmp = a.contactsCount - b.contactsCount
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, query, sortKey, sortDir])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Building2Icon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Clients</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground"
              style={{ width: 14, height: 14, left: 10 }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-64"
              style={{ paddingLeft: 30 }}
            />
          </div>
          {canWrite && (
            <Button render={<Link href="/clients/nouveau" />} nativeButton={false} size="sm">
              <PlusIcon />
              Ajouter un client
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0 ? 'Aucun client pour le moment.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Client" active={sortKey === 'name'} direction={sortDir} onClick={() => toggleSort('name')} className="ps-6" />
                <TableHead>SIRET</TableHead>
                <TableHead>Ville</TableHead>
                <SortableHead label="Statut" active={sortKey === 'status'} direction={sortDir} onClick={() => toggleSort('status')} />
                <SortableHead label="Contacts" active={sortKey === 'contacts'} direction={sortDir} onClick={() => toggleSort('contacts')} />
                <TableHead className="pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="h-14">
                  <TableCell className="ps-6 font-medium">
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${c.id}`} style={{ textDecoration: 'none' }}>
                        {c.companyName}
                      </Link>
                      {c.isPublicSector && <Badge variant="warning">Secteur public</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.siret ?? 'Non renseigné'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city ?? 'Non renseignée'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CLIENT_STATUS_LABELS[c.status] ?? c.status}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{c.contactsCount}</TableCell>
                  <TableCell className="pe-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/clients/${c.id}`} />}>
                          <EyeIcon />
                          Voir
                        </DropdownMenuItem>
                        {canWrite && (
                          <DropdownMenuItem render={<Link href={`/clients/${c.id}/modifier`} />}>
                            <PencilIcon />
                            Modifier
                          </DropdownMenuItem>
                        )}
                        {canWrite && (
                          <>
                            <DropdownMenuSeparator />
                            <form action={archiveClientAction}>
                              <input type="hidden" name="id" value={c.id} />
                              <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                                <ArchiveIcon />
                                Archiver
                              </DropdownMenuItem>
                            </form>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
