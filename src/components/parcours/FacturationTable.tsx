'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { ReceiptIcon, SearchIcon, MoreHorizontalIcon, PlusIcon, EyeIcon, FileTextIcon, BadgeCheckIcon, SendIcon, UploadCloudIcon, BanknoteIcon, Trash2Icon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAYER_TYPE_LABELS } from '@/lib/participant-labels'
import { euros } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { GenerateDocumentMenuItem } from '@/components/parcours/GenerateDocumentMenuItem'
import {
  generateFactureDocumentAction,
  generateFactureCertificatAction,
  markFactureSentAction,
  markFactureChorusProSentAction,
  markFacturePaidAction,
  deleteFactureAction,
} from '@/app/(app)/parcours/facturation-actions'

export type FactureRow = {
  id: string
  montantHT: number
  sequenceCount: number
  periodLabel: string
  documentId: string | null
  certificatDocumentId: string | null
  sentAt: string | null
  chorusProSentAt: string | null
  paidAt: string | null
}

export type FacturationGroupRow = {
  contractualisationId: string
  payerName: string
  payerType: string
  isPublicSectorClient: boolean
  canCreateFacture: boolean
  totalSequences: number
  invoicedSequences: number
  factures: FactureRow[]
}

function factureStatus(f: FactureRow): { label: string; variant: 'secondary' | 'accent' | 'success' } {
  if (f.paidAt) return { label: 'Payée', variant: 'success' }
  if (f.sentAt) return { label: 'Envoyée', variant: 'accent' }
  if (f.documentId) return { label: 'Générée', variant: 'secondary' }
  return { label: 'Brouillon', variant: 'secondary' }
}

export function FacturationTable({ data, canWrite, parcoursId }: { data: FacturationGroupRow[]; canWrite: boolean; parcoursId: string }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? data.filter((g) => g.payerName.toLowerCase().includes(q)) : data
  }, [data, query])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <ReceiptIcon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Facturation</CardTitle>
        </div>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground"
            style={{ width: 14, height: 14, left: 10 }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un payeur..."
            className="w-64"
            style={{ paddingLeft: 30 }}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0 ? 'Aucune contractualisation signée — la facturation démarre après la signature de la convention.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6 min-w-[280px]">Payeur</TableHead>
                <TableHead className="min-w-[180px]">Type</TableHead>
                <TableHead className="min-w-[180px]">Séquences facturées</TableHead>
                <TableHead className="min-w-[180px]">Montant facturé</TableHead>
                <TableHead className="min-w-[180px]">Montant payé</TableHead>
                <TableHead className="min-w-[110px]">Documents</TableHead>
                <TableHead className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => {
                const isExpanded = expanded.has(g.contractualisationId)
                const canExpand = g.factures.length > 0
                const montantFacture = g.factures.reduce((sum, f) => sum + f.montantHT, 0)
                const montantPaye = g.factures.filter((f) => f.paidAt).reduce((sum, f) => sum + f.montantHT, 0)

                return (
                  <Fragment key={g.contractualisationId}>
                    <TableRow
                      className={cn('group', canExpand && 'cursor-pointer')}
                      onClick={canExpand ? () => toggleExpanded(g.contractualisationId) : undefined}
                    >
                      <TableCell className="ps-6 min-w-[280px] align-top whitespace-normal py-5">
                        <div className="flex items-center gap-2">
                          {canExpand && (
                            <ChevronRightIcon
                              className={cn('shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                              style={{ width: 14, height: 14 }}
                            />
                          )}
                          <span className="font-medium">{g.payerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5">
                        <Badge variant="secondary">{PAYER_TYPE_LABELS[g.payerType] ?? g.payerType}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5 tabular-nums text-muted-foreground">
                        {g.invoicedSequences} / {g.totalSequences}
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5 text-muted-foreground">{euros(montantFacture)}</TableCell>
                      <TableCell className="min-w-[180px] align-top py-5 text-muted-foreground">{euros(montantPaye)}</TableCell>
                      <TableCell className="min-w-[110px] align-top py-5" />
                      <TableCell
                        className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 align-top py-5 text-right group-hover:bg-muted/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canWrite && g.canCreateFacture && (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                              <MoreHorizontalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                render={
                                  <Link href={`/parcours/${parcoursId}/contractualisations/${g.contractualisationId}/factures/nouveau`} />
                                }
                              >
                                <PlusIcon />
                                Nouvelle facture
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      g.factures.map((f) => {
                        const status = factureStatus(f)
                        return (
                          <TableRow key={f.id} className="bg-muted/20">
                            <TableCell className="ps-6 min-w-[280px] py-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>{f.periodLabel}</span>
                                <span className="t-caption-1">
                                  ({f.sequenceCount} séquence{f.sequenceCount > 1 ? 's' : ''})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[180px] py-3" />
                            <TableCell className="min-w-[180px] py-3" />
                            <TableCell className="min-w-[180px] py-3 text-muted-foreground">{euros(f.montantHT)}</TableCell>
                            <TableCell className="min-w-[180px] py-3">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {f.chorusProSentAt && (
                                <Badge variant="accent" style={{ marginLeft: 'var(--space-2)' }}>
                                  Chorus Pro
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[110px] py-3">
                              {f.documentId || f.certificatDocumentId ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Documents" />}>
                                    <FileTextIcon style={{ width: 14, height: 14 }} />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {f.documentId && (
                                      <DropdownMenuItem render={<a href={`/api/documents/${f.documentId}`} target="_blank" rel="noreferrer" />}>
                                        <FileTextIcon />
                                        Facture
                                      </DropdownMenuItem>
                                    )}
                                    {f.certificatDocumentId && (
                                      <DropdownMenuItem
                                        render={<a href={`/api/documents/${f.certificatDocumentId}`} target="_blank" rel="noreferrer" />}
                                      >
                                        <BadgeCheckIcon />
                                        Certificat de réalisation
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="sticky right-0 z-10 min-w-[70px] border-l bg-card py-3 pe-6 text-right">
                              {canWrite && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                                    <MoreHorizontalIcon />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {f.documentId && (
                                      <DropdownMenuItem render={<a href={`/api/documents/${f.documentId}`} target="_blank" rel="noreferrer" />}>
                                        <EyeIcon />
                                        Voir
                                      </DropdownMenuItem>
                                    )}
                                    {!f.documentId && (
                                      <GenerateDocumentMenuItem
                                        action={generateFactureDocumentAction}
                                        parcoursId={parcoursId}
                                        hiddenFields={{ factureId: f.id }}
                                        label="Générer la facture"
                                        icon={FileTextIcon}
                                      />
                                    )}
                                    {f.documentId && !f.sentAt && (
                                      <GenerateDocumentMenuItem
                                        action={markFactureSentAction}
                                        parcoursId={parcoursId}
                                        hiddenFields={{ factureId: f.id }}
                                        label="Marquer envoyée"
                                        icon={SendIcon}
                                      />
                                    )}
                                    {!f.certificatDocumentId && (
                                      <GenerateDocumentMenuItem
                                        action={generateFactureCertificatAction}
                                        parcoursId={parcoursId}
                                        hiddenFields={{ factureId: f.id }}
                                        label="Certificat de réalisation"
                                        icon={BadgeCheckIcon}
                                      />
                                    )}
                                    {f.documentId && !f.chorusProSentAt && g.isPublicSectorClient && (
                                      <GenerateDocumentMenuItem
                                        action={markFactureChorusProSentAction}
                                        parcoursId={parcoursId}
                                        hiddenFields={{ factureId: f.id }}
                                        label="Marquer envoyée via Chorus Pro"
                                        icon={UploadCloudIcon}
                                      />
                                    )}
                                    {f.sentAt && !f.paidAt && (
                                      <GenerateDocumentMenuItem
                                        action={markFacturePaidAction}
                                        parcoursId={parcoursId}
                                        hiddenFields={{ factureId: f.id }}
                                        label="Marquer payée"
                                        icon={BanknoteIcon}
                                      />
                                    )}
                                    {!f.documentId && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <form action={deleteFactureAction}>
                                          <input type="hidden" name="factureId" value={f.id} />
                                          <input type="hidden" name="parcoursId" value={parcoursId} />
                                          <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                                            <Trash2Icon />
                                            Supprimer
                                          </DropdownMenuItem>
                                        </form>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
