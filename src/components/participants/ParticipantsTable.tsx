'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { UsersIcon, SearchIcon, MoreHorizontalIcon, ArrowUpDownIcon, PlusIcon, EyeIcon, PencilIcon } from 'lucide-react'
import { SITUATION_LABELS } from '@/lib/participant-labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type ParticipantRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  situation: string
  clientName: string | null
  parcoursCount: number
}

type SortKey = 'name' | 'situation' | 'parcours'

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

export function ParticipantsTable({ data, canWrite }: { data: ParticipantRow[]; canWrite: boolean }) {
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
      ? data.filter((p) => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q))
      : data

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      else if (sortKey === 'situation') cmp = a.situation.localeCompare(b.situation)
      else cmp = a.parcoursCount - b.parcoursCount
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, query, sortKey, sortDir])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <UsersIcon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Participants</CardTitle>
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
              placeholder="Rechercher un participant..."
              className="w-64"
              style={{ paddingLeft: 30 }}
            />
          </div>
          {canWrite && (
            <Button render={<Link href="/participants/nouveau" />} nativeButton={false} size="sm">
              <PlusIcon />
              Ajouter un participant
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0 ? 'Aucun participant pour le moment.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Nom" active={sortKey === 'name'} direction={sortDir} onClick={() => toggleSort('name')} className="ps-6" />
                <TableHead>Email</TableHead>
                <TableHead>Employeur</TableHead>
                <SortableHead label="Situation" active={sortKey === 'situation'} direction={sortDir} onClick={() => toggleSort('situation')} />
                <SortableHead label="Parcours" active={sortKey === 'parcours'} direction={sortDir} onClick={() => toggleSort('parcours')} />
                <TableHead className="pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="h-14">
                  <TableCell className="ps-6 font-medium">
                    <Link href={`/participants/${p.id}`} style={{ textDecoration: 'none' }}>
                      {p.firstName} {p.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="text-muted-foreground">{p.clientName ?? 'Aucun employeur renseigné'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{SITUATION_LABELS[p.situation] ?? p.situation}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{p.parcoursCount}</TableCell>
                  <TableCell className="pe-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/participants/${p.id}`} />}>
                          <EyeIcon />
                          Voir
                        </DropdownMenuItem>
                        {canWrite && (
                          <DropdownMenuItem render={<Link href={`/participants/${p.id}/modifier`} />}>
                            <PencilIcon />
                            Modifier
                          </DropdownMenuItem>
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
