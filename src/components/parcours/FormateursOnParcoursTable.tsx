'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCapIcon, SearchIcon, MoreHorizontalIcon, ArrowUpDownIcon, EyeIcon, FileCheck2Icon } from 'lucide-react'
import { CONTRACT_TYPE_LABELS } from '@/lib/formateur-labels'
import { euros } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { GenerateDocumentMenuItem } from '@/components/parcours/GenerateDocumentMenuItem'
import { DocumentBadgeMenu, type DocumentRow } from '@/components/parcours/DocumentBadgeMenu'
import { generateConventionSousTraitanceAction } from '@/app/(app)/parcours/document-actions'

export type FormateurOnParcoursRow = {
  id: string
  firstName: string
  lastName: string
  contractType: string
  isActive: boolean
  sequenceCount: number
  totalHeures: string
  /** Euro cents — 0 for internal formateurs (no external cost). */
  estimatedCost: number
  documents: DocumentRow[]
}

type SortKey = 'name' | 'sequenceCount' | 'estimatedCost'

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
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium text-foreground">
        {label}
        <ArrowUpDownIcon className={active ? 'opacity-100' : 'opacity-40'} style={{ width: 12, height: 12 }} />
        {active && <span className="sr-only">({direction === 'asc' ? 'croissant' : 'décroissant'})</span>}
      </button>
    </TableHead>
  )
}

export function FormateursOnParcoursTable({
  data,
  canWrite,
  parcoursId,
}: {
  data: FormateurOnParcoursRow[]
  canWrite: boolean
  parcoursId: string
}) {
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
    const filtered = q ? data.filter((f) => `${f.firstName} ${f.lastName}`.toLowerCase().includes(q)) : data

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      else if (sortKey === 'sequenceCount') cmp = a.sequenceCount - b.sequenceCount
      else cmp = a.estimatedCost - b.estimatedCost
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
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0
              ? "Aucun formateur assigné à une séquence de ce parcours pour l'instant."
              : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Formateur" active={sortKey === 'name'} direction={sortDir} onClick={() => toggleSort('name')} className="ps-6" />
                <TableHead>Type de contrat</TableHead>
                <SortableHead
                  label="Séquences assignées"
                  active={sortKey === 'sequenceCount'}
                  direction={sortDir}
                  onClick={() => toggleSort('sequenceCount')}
                />
                <TableHead>Heures</TableHead>
                <SortableHead
                  label="Coût estimé"
                  active={sortKey === 'estimatedCost'}
                  direction={sortDir}
                  onClick={() => toggleSort('estimatedCost')}
                />
                <TableHead className="min-w-[220px]">Documents</TableHead>
                <TableHead className="pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => {
                const hasConvention = f.documents.some((d) => d.type === 'CONVENTION_SOUS_TRAITANCE' && !d.isVoid)
                const canGenerateConvention = canWrite && f.contractType === 'EXTERNE_PRESTATAIRE' && !hasConvention

                return (
                  <TableRow key={f.id}>
                    <TableCell className="ps-6 align-top py-5">
                      <div className="flex items-center gap-2">
                        <Link href={`/formateurs/${f.id}`} className="font-medium" style={{ textDecoration: 'none' }}>
                          {f.firstName} {f.lastName}
                        </Link>
                        {!f.isActive && <Badge variant="secondary">Inactif</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-5">
                      <Badge variant="secondary">{CONTRACT_TYPE_LABELS[f.contractType] ?? f.contractType}</Badge>
                    </TableCell>
                    <TableCell className="align-top py-5 tabular-nums text-muted-foreground">{f.sequenceCount}</TableCell>
                    <TableCell className="align-top py-5 tabular-nums text-muted-foreground">{f.totalHeures}h</TableCell>
                    <TableCell className="align-top py-5 tabular-nums text-muted-foreground">{euros(f.estimatedCost)}</TableCell>
                    <TableCell className="min-w-[220px] align-top whitespace-normal py-5">
                      {f.documents.length > 0 ? (
                        f.documents.map((d) => <DocumentBadgeMenu key={d.id} doc={d} parcoursId={parcoursId} canWrite={canWrite} />)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pe-6 align-top py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-64">
                          <DropdownMenuItem render={<Link href={`/formateurs/${f.id}`} />}>
                            <EyeIcon />
                            Voir le formateur
                          </DropdownMenuItem>
                          {canGenerateConvention && (
                            <>
                              <DropdownMenuSeparator />
                              <GenerateDocumentMenuItem
                                action={generateConventionSousTraitanceAction}
                                parcoursId={parcoursId}
                                hiddenFields={{ formateurId: f.id }}
                                label="Générer la convention de sous-traitance"
                                icon={FileCheck2Icon}
                              />
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
