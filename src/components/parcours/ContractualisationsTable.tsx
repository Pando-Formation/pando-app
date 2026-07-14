'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ReceiptIcon,
  SearchIcon,
  MoreHorizontalIcon,
  PlusIcon,
  FileTextIcon,
  FileCheck2Icon,
  GraduationCapIcon,
  PencilIcon,
  Trash2Icon,
  ChevronRightIcon,
  BanIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAYER_TYPE_LABELS, CONTRACTUALISATION_STATUS_LABELS, FINANCEMENT_TYPE_LABELS, isContractualisationAtLeast } from '@/lib/participant-labels'
import { euros } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { GenerateDocumentMenuItem } from '@/components/parcours/GenerateDocumentMenuItem'
import { DocumentBadgeMenu, type DocumentRow } from '@/components/parcours/DocumentBadgeMenu'
import { deleteFinancementAction, cancelContractualisationAction } from '@/app/(app)/parcours/actions'
import { generateDevisAction, generateConventionAction, generateAttestationPackAction } from '@/app/(app)/parcours/document-actions'

export type FinancementRow = {
  id: string
  type: string
  financeurName: string | null
  dossierNumber: string | null
  montantPrisEnCharge: number
}

export type { DocumentRow }

export type ContractualisationRow = {
  id: string
  payerType: string
  payerName: string
  status: string
  montantHT: number
  participantsCount: number
  isPublicSectorClient: boolean
  numeroEngagement: string | null
  codeService: string | null
  retractationEndsAt: string | null
  paymentTriggerDate: string | null
  financements: FinancementRow[]
  documents: DocumentRow[]
}

function nextStepHint(status: string, isPublicSector: boolean): string | null {
  switch (status) {
    case 'BROUILLON':
      return isPublicSector ? 'Prochaine étape : convention (devis optionnel, secteur public)' : 'Prochaine étape : générer le devis'
    case 'DEVIS_ENVOYE':
      return 'En attente de signature du devis'
    case 'DEVIS_SIGNE':
      return 'Prochaine étape : générer la convention'
    case 'CONVENTION_ENVOYEE':
      return 'En attente de signature de la convention'
    case 'CONVENTION_SIGNEE':
      return 'Prochaine étape : facturation au fur et à mesure des séquences réalisées'
    default:
      return null
  }
}

export function ContractualisationsTable({
  data,
  canWrite,
  parcoursId,
}: {
  data: ContractualisationRow[]
  canWrite: boolean
  parcoursId: string
}) {
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
    return q ? data.filter((c) => c.payerName.toLowerCase().includes(q)) : data
  }, [data, query])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <ReceiptIcon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Contractualisations</CardTitle>
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
              placeholder="Rechercher un payeur..."
              className="w-64"
              style={{ paddingLeft: 30 }}
            />
          </div>
          {canWrite && (
            <Button render={<Link href={`/parcours/${parcoursId}/contractualisations/nouveau`} />} nativeButton={false} size="sm">
              <PlusIcon />
              Ajouter une contractualisation
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0
              ? 'Aucune contractualisation — le montant HT du parcours restera à 0 €.'
              : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6 min-w-[280px]">Payeur</TableHead>
                <TableHead className="min-w-[180px]">Type</TableHead>
                <TableHead className="min-w-[180px]">Statut</TableHead>
                <TableHead className="min-w-[180px]">Montant HT</TableHead>
                <TableHead className="min-w-[140px]">Participants</TableHead>
                <TableHead className="min-w-[280px]">Documents</TableHead>
                <TableHead className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const hasDevis = c.documents.some((d) => d.type === 'DEVIS' && !d.isVoid)
                const hasConvention = c.documents.some(
                  (d) => (d.type === 'CONVENTION_DE_FORMATION' || d.type === 'CONTRAT_DE_FORMATION_PRO') && !d.isVoid,
                )
                const hasAttestation = c.documents.some((d) => d.type === 'ATTESTATION_FORMATION' && !d.isVoid)

                // 🔴 One-shot per document type — once generated, the action disappears from
                // the menu. Regenerating requires voiding the existing document first (via its
                // badge's "Supprimer"), never a second, unreconciled copy sitting alongside it.
                const canGenerateDevis = canWrite && c.status !== 'ANNULEE' && !hasDevis
                const canGenerateConvention =
                  canWrite &&
                  c.status !== 'ANNULEE' &&
                  !hasConvention &&
                  (c.isPublicSectorClient || isContractualisationAtLeast(c.status, 'DEVIS_SIGNE'))
                const canGenerateAttestation = canWrite && !hasAttestation
                const canGenerateAny = canGenerateDevis || canGenerateConvention || canGenerateAttestation
                const hint = nextStepHint(c.status, c.isPublicSectorClient)

                const isExpanded = expanded.has(c.id)
                const canExpand = c.financements.length > 0

                return (
                  <Fragment key={c.id}>
                    <TableRow
                      className={cn('group', canExpand && 'cursor-pointer')}
                      onClick={canExpand ? () => toggleExpanded(c.id) : undefined}
                    >
                      <TableCell className="ps-6 min-w-[280px] align-top whitespace-normal py-5">
                        <div className="flex items-center gap-2">
                          {canExpand && (
                            <ChevronRightIcon
                              className={cn('shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                              style={{ width: 14, height: 14 }}
                            />
                          )}
                          <span className="font-medium">{c.payerName}</span>
                        </div>
                        {c.numeroEngagement && (
                          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                            engagement {c.numeroEngagement}
                          </p>
                        )}
                        {hint && (
                          <p className="t-caption-1 text-muted-foreground" style={{ marginTop: 'var(--space-2)' }}>
                            {hint}
                          </p>
                        )}
                        {c.retractationEndsAt && (
                          <Badge variant="warning" style={{ marginTop: 'var(--space-2)', whiteSpace: 'normal', height: 'auto' }}>
                            Rétractation jusqu&apos;au {new Date(c.retractationEndsAt).toLocaleDateString('fr-FR')}
                            {c.paymentTriggerDate && (
                              <> · paiement déclenché le {new Date(c.paymentTriggerDate).toLocaleDateString('fr-FR')}</>
                            )}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5">
                        <Badge variant="secondary">{PAYER_TYPE_LABELS[c.payerType] ?? c.payerType}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5">
                        <Badge variant="accent">{CONTRACTUALISATION_STATUS_LABELS[c.status] ?? c.status}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top py-5 text-muted-foreground">{euros(c.montantHT)}</TableCell>
                      <TableCell className="min-w-[140px] align-top py-5 tabular-nums text-muted-foreground">{c.participantsCount}</TableCell>
                      <TableCell className="min-w-[280px] align-top whitespace-normal py-5" onClick={(e) => e.stopPropagation()}>
                        {c.documents.length > 0 ? (
                          c.documents.map((d) => <DocumentBadgeMenu key={d.id} doc={d} parcoursId={parcoursId} canWrite={canWrite} />)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 align-top py-5 text-right group-hover:bg-muted/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-64">
                            {canWrite && (
                              <DropdownMenuItem
                                render={<Link href={`/parcours/${parcoursId}/contractualisations/${c.id}/financements/nouveau`} />}
                              >
                                <PlusIcon />
                                Ajouter un financement
                              </DropdownMenuItem>
                            )}
                            {canGenerateAny && <DropdownMenuSeparator />}
                            {canGenerateDevis && (
                              <GenerateDocumentMenuItem
                                action={generateDevisAction}
                                parcoursId={parcoursId}
                                hiddenFields={{ contractualisationId: c.id }}
                                label="Générer le devis"
                                icon={FileTextIcon}
                              />
                            )}
                            {canGenerateConvention && (
                              <GenerateDocumentMenuItem
                                action={generateConventionAction}
                                parcoursId={parcoursId}
                                hiddenFields={{ contractualisationId: c.id }}
                                label={c.payerType === 'INDIVIDU' ? 'Générer le contrat' : 'Générer la convention'}
                                icon={FileCheck2Icon}
                              />
                            )}
                            {canGenerateAttestation && (
                              <GenerateDocumentMenuItem
                                action={generateAttestationPackAction}
                                parcoursId={parcoursId}
                                hiddenFields={{ contractualisationId: c.id }}
                                label="Attestations (ce payeur)"
                                icon={GraduationCapIcon}
                              />
                            )}
                            {canWrite && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem render={<Link href={`/parcours/${parcoursId}/contractualisations/${c.id}/modifier`} />}>
                                  <PencilIcon />
                                  Modifier
                                </DropdownMenuItem>
                              </>
                            )}
                            {canWrite && c.status !== 'ANNULEE' && (
                              <form action={cancelContractualisationAction}>
                                <input type="hidden" name="id" value={c.id} />
                                <input type="hidden" name="parcoursId" value={parcoursId} />
                                <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                                  <BanIcon />
                                  Supprimer
                                </DropdownMenuItem>
                              </form>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      c.financements.map((f) => (
                      <TableRow key={f.id} className="bg-muted/20">
                        <TableCell className="ps-6 min-w-[280px] py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{FINANCEMENT_TYPE_LABELS[f.type] ?? f.type}</span>
                            {f.financeurName && <span>— {f.financeurName}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[180px] py-3" />
                        <TableCell className="min-w-[180px] py-3 text-muted-foreground">
                          {f.dossierNumber && <>dossier {f.dossierNumber}</>}
                        </TableCell>
                        <TableCell className="min-w-[180px] py-3 text-muted-foreground">{euros(f.montantPrisEnCharge)}</TableCell>
                        <TableCell className="min-w-[140px] py-3" />
                        <TableCell className="min-w-[280px] py-3" />
                        <TableCell className="sticky right-0 z-10 min-w-[70px] border-l bg-card py-3 pe-6 text-right">
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                                <MoreHorizontalIcon />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  render={
                                    <Link href={`/parcours/${parcoursId}/contractualisations/${c.id}/financements/${f.id}/modifier`} />
                                  }
                                >
                                  <PencilIcon />
                                  Éditer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <form action={deleteFinancementAction}>
                                  <input type="hidden" name="id" value={f.id} />
                                  <input type="hidden" name="parcoursId" value={parcoursId} />
                                  <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                                    <Trash2Icon />
                                    Supprimer
                                  </DropdownMenuItem>
                                </form>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
