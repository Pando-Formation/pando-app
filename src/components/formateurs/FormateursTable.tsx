'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCapIcon, SearchIcon, MoreHorizontalIcon, ArrowUpDownIcon, PlusIcon, EyeIcon, PencilIcon, ArchiveIcon } from 'lucide-react'
import { CONTRACT_TYPE_LABELS } from '@/lib/formateur-labels'
import { euros } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { archiveFormateurAction } from '@/app/(app)/formateurs/actions'

export type FormateurRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  contractType: string
  /** Euro cents. */
  dayCost: number
  hasExpiryWarning: boolean
}

type SortKey = 'name' | 'contractType' | 'dayCost'

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

export function FormateursTable({ data }: { data: FormateurRow[] }) {
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
      ? data.filter((f) => `${f.firstName} ${f.lastName} ${f.email}`.toLowerCase().includes(q))
      : data

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      else if (sortKey === 'contractType') cmp = a.contractType.localeCompare(b.contractType)
      else cmp = a.dayCost - b.dayCost
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, query, sortKey, sortDir])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <GraduationCapIcon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Formateurs</CardTitle>
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
              placeholder="Rechercher un formateur..."
              className="w-64"
              style={{ paddingLeft: 30 }}
            />
          </div>
          <Button render={<Link href="/formateurs/nouveau" />} nativeButton={false} size="sm">
            <PlusIcon />
            Ajouter un formateur
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0 ? 'Aucun formateur pour le moment.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Formateur" active={sortKey === 'name'} direction={sortDir} onClick={() => toggleSort('name')} className="ps-6" />
                <TableHead>Email</TableHead>
                <SortableHead label="Type de contrat" active={sortKey === 'contractType'} direction={sortDir} onClick={() => toggleSort('contractType')} />
                <SortableHead label="Coût réel / jour" active={sortKey === 'dayCost'} direction={sortDir} onClick={() => toggleSort('dayCost')} />
                <TableHead className="pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => (
                <TableRow key={f.id} className="h-14">
                  <TableCell className="ps-6 font-medium">
                    <div className="flex items-center gap-2">
                      <Link href={`/formateurs/${f.id}`} style={{ textDecoration: 'none' }}>
                        {f.firstName} {f.lastName}
                      </Link>
                      {f.hasExpiryWarning && <Badge variant="warning">Certification à vérifier</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CONTRACT_TYPE_LABELS[f.contractType]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{euros(f.dayCost)}</TableCell>
                  <TableCell className="pe-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/formateurs/${f.id}`} />}>
                          <EyeIcon />
                          Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`/formateurs/${f.id}/modifier`} />}>
                          <PencilIcon />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <form action={archiveFormateurAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                            <ArchiveIcon />
                            Archiver
                          </DropdownMenuItem>
                        </form>
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
