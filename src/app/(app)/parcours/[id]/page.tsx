import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros, formateurDayCost } from '@/lib/money'
import { TRACK_LABELS, PARCOURS_STATUS_LABELS, PANDO_ROLE_LABELS } from '@/lib/parcours-labels'
import { PAYER_TYPE_LABELS, PARTICIPANT_STATUS_LABELS, isContractualisationAtLeast } from '@/lib/participant-labels'
import { computePaymentTriggerDate } from '@/lib/participant'
import { DELIVERY_STATUS_LABELS } from '@/lib/communication-labels'
import { simulateDeliveryAction } from '@/app/(app)/parcours/communication-actions'
import type { FormationSnapshot } from '@/lib/formation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'
import { SequencesTable, type FormationSessionRow, type SequenceRow } from '@/components/parcours/SequencesTable'
import { ContractualisationsTable, type ContractualisationRow } from '@/components/parcours/ContractualisationsTable'
import { ParticipantConvocationMenu } from '@/components/parcours/ParticipantConvocationMenu'
import { FacturationTable, type FacturationGroupRow } from '@/components/parcours/FacturationTable'
import { FormateursOnParcoursTable, type FormateurOnParcoursRow } from '@/components/parcours/FormateursOnParcoursTable'
import type { VariantProps } from 'class-variance-authority'

const TABS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'sequences', label: 'Sessions' },
  { id: 'contractualisations', label: 'Contractualisations' },
  { id: 'participants', label: 'Participants' },
  { id: 'facturation', label: 'Facturation' },
  { id: 'envois', label: 'Envois' },
  { id: 'formateurs', label: 'Formateurs' },
] as const
type TabId = (typeof TABS)[number]['id']

function deliveryStatusBadgeVariant(status: string): NonNullable<VariantProps<typeof badgeVariants>['variant']> {
  if (status === 'DELIVERED' || status === 'OPENED') return 'success'
  if (status === 'HARD_BOUNCE' || status === 'BLOCKED' || status === 'SPAM') return 'destructive'
  if (status === 'SOFT_BOUNCE' || status === 'SENT') return 'warning'
  return 'secondary'
}

export default async function ParcoursDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const [parcours, sousTraitanceDocuments] = await Promise.all([
    db.parcours.findUnique({
      where: { id },
      include: {
        formationVersion: true,
        client: { select: { companyName: true } },
        beneficiaire: { select: { companyName: true } },
        donneurOrdre: { select: { companyName: true } },
        sequences: {
          orderBy: { date: 'asc' },
          include: {
            formateur: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                contractType: true,
                tvaRate: true,
                tarifJour: true,
                forfaitDeplacement: true,
                isActive: true,
              },
            },
          },
        },
        formationSessions: {
          where: { deletedAt: null },
          orderBy: { ordre: 'asc' },
          include: {
            sequences: {
              orderBy: { date: 'asc' },
              include: {
                formateur: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    contractType: true,
                    tvaRate: true,
                    tarifJour: true,
                    forfaitDeplacement: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        contractualisations: {
          where: { status: { not: 'ANNULEE' } },
          orderBy: { createdAt: 'asc' },
          include: {
            payerClient: { select: { companyName: true, isPublicSector: true } },
            payerParticipant: { select: { firstName: true, lastName: true } },
            financeur: { select: { name: true } },
            financements: { include: { financeur: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
            documents: { orderBy: { createdAt: 'desc' } },
            factures: {
              orderBy: { createdAt: 'asc' },
              include: {
                sequences: { select: { id: true, date: true } },
                documents: { where: { isVoid: false }, orderBy: { createdAt: 'desc' } },
              },
            },
            _count: { select: { participants: true } },
          },
        },
        participants: {
          orderBy: { createdAt: 'asc' },
          include: {
            participant: true,
            contractualisation: { select: { payerType: true, status: true } },
            documents: { where: { type: 'CONVOCATION' }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        communicationSequences: {
          include: { messages: { orderBy: { createdAt: 'desc' } } },
        },
      },
    }),
    db.document.findMany({ where: { parcoursId: id, type: 'CONVENTION_SOUS_TRAITANCE' }, orderBy: { createdAt: 'desc' } }),
  ])
  if (!parcours) notFound()

  const messages = parcours.communicationSequences.flatMap((cs) => cs.messages)
  const snapshot = parcours.formationVersion.snapshot as unknown as FormationSnapshot

  // 🔴 RGPD SCOPE — Formateur day-rate/address/cost data is not part of
  // COMMERCIAL's stated scope (see requireAdmin's comment in lib/authz.ts),
  // even though COMMERCIAL can otherwise view this page. The tab is hidden
  // entirely — nav entry and content — rather than just gating its actions.
  const visibleTabs = TABS.filter((t) => t.id !== 'formateurs' || canWrite)

  // 🔴 THE CONTRACT = ALL THE SÉQUENCES this formateur is assigned to, on
  // THIS parcours only — same cost formula as lib/pilotage.ts's getMargin(),
  // so this number always matches what pilotage reports for this formateur.
  const formateurRows: FormateurOnParcoursRow[] = (() => {
    type Assignment = {
      formateur: NonNullable<(typeof parcours.sequences)[number]['formateur']>
      sequenceCount: number
      totalHeures: number
      estimatedCost: number
    }
    const byFormateur = new Map<string, Assignment>()
    for (const s of parcours.sequences) {
      if (!s.formateur) continue
      const dayCost = formateurDayCost({
        contractType: s.formateur.contractType,
        tarifJour: s.formateur.tarifJour,
        tvaRate: Number(s.formateur.tvaRate),
        forfaitDeplacement: s.formateur.forfaitDeplacement,
      })
      const cost = Math.round(dayCost * (Number(s.heures) / 7))
      const existing = byFormateur.get(s.formateur.id)
      if (existing) {
        existing.sequenceCount += 1
        existing.totalHeures += Number(s.heures)
        existing.estimatedCost += cost
      } else {
        byFormateur.set(s.formateur.id, { formateur: s.formateur, sequenceCount: 1, totalHeures: Number(s.heures), estimatedCost: cost })
      }
    }
    return Array.from(byFormateur.values()).map((a) => ({
      id: a.formateur.id,
      firstName: a.formateur.firstName,
      lastName: a.formateur.lastName,
      contractType: a.formateur.contractType,
      isActive: a.formateur.isActive,
      sequenceCount: a.sequenceCount,
      totalHeures: a.totalHeures.toString(),
      estimatedCost: a.estimatedCost,
      documents: sousTraitanceDocuments
        .filter((d) => d.formateurId === a.formateur.id)
        .map((d) => ({ id: d.id, type: d.type, signatureStatus: d.signatureStatus, isVoid: d.isVoid })),
    }))
  })()

  const activeTab: TabId = visibleTabs.some((t) => t.id === tab) ? (tab as TabId) : 'apercu'
  const counts: Record<TabId, number | null> = {
    apercu: null,
    sequences: parcours.formationSessions.length,
    contractualisations: parcours.contractualisations.length,
    participants: parcours.participants.length,
    facturation: parcours.contractualisations.reduce((n, c) => n + c.factures.length, 0),
    envois: messages.length,
    formateurs: formateurRows.length,
  }
  const realizedSequenceCount = parcours.sequences.filter((s) => s.date <= new Date()).length

  return (
    <>
      <PageHero>
        <div className="flex items-start justify-between">
          <div>
            <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
              Parcours
            </div>
            <h1 className="t-title-2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              {parcours.reference}
              <Badge variant="secondary">{PARCOURS_STATUS_LABELS[parcours.status] ?? parcours.status}</Badge>
            </h1>
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              {snapshot.title} (v{parcours.formationVersion.version})
            </p>
          </div>
          {canWrite && (
            <Button render={<Link href={`/parcours/${parcours.id}/modifier`} />} nativeButton={false} variant="secondary">
              Modifier
            </Button>
          )}
        </div>
      </PageHero>

      {parcours.status === 'ANNULE' && parcours.cancellationReason && (
        <Card style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-6)' }}>
          <CardContent>
            <Badge variant="destructive">Annulé</Badge>
            <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
              {parcours.cancellationReason}
            </p>
          </CardContent>
        </Card>
      )}

      <nav
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border-subtle)',
          marginBottom: 'var(--space-7)',
        }}
      >
        {visibleTabs.map((t) => {
          const isActive = t.id === activeTab
          return (
            <Link
              key={t.id}
              href={t.id === 'apercu' ? `/parcours/${parcours.id}` : `/parcours/${parcours.id}?tab=${t.id}`}
              className="t-nav-m"
              style={{
                display: 'inline-block',
                padding: 'var(--space-4) 0',
                marginBottom: '-1px',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                textDecoration: 'none',
              }}
            >
              {t.label}
              {counts[t.id] !== null && <span className="t-caption-1"> ({counts[t.id]})</span>}
            </Link>
          )
        })}
      </nav>

      {activeTab === 'apercu' && (
        <>
          <Card style={{ marginBottom: 'var(--space-6)' }}>
            <CardHeader>
              <CardTitle>Cadre</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
                <Field label="Track" value={TRACK_LABELS[parcours.track] ?? parcours.track} />
                <Field label="Rôle PANDO" value={PANDO_ROLE_LABELS[parcours.pandoRole] ?? parcours.pandoRole} />
                <Field label="Client" value={parcours.client?.companyName ?? '— (inter)'} />
                <Field label="Bénéficiaire" value={parcours.beneficiaire?.companyName ?? '—'} />
                {parcours.pandoRole === 'SOUS_TRAITANT' && (
                  <Field label="Donneur d'ordre" value={parcours.donneurOrdre?.companyName ?? '—'} />
                )}
                <Field
                  label="Effectif"
                  value={
                    parcours.minParticipants || parcours.maxParticipants
                      ? `${parcours.minParticipants ?? '?'} – ${parcours.maxParticipants ?? '?'}`
                      : '—'
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dérivé des séquences — lecture seule</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-5)' }}>
                <Field label="Début" value={parcours.dateDebut ? new Date(parcours.dateDebut).toLocaleDateString('fr-FR') : '—'} />
                <Field label="Fin" value={parcours.dateFin ? new Date(parcours.dateFin).toLocaleDateString('fr-FR') : '—'} />
                <Field label="Durée totale" value={`${parcours.totalHours.toString()} h`} />
                <Field label="Montant HT" value={euros(parcours.montantHT)} />
              </div>
              <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
                Aucun champ ci-dessus n&apos;est saisi à la main — modifier une séquence recalcule automatiquement ces
                quatre valeurs.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'sequences' && (
        <SequencesTable
          canWrite={canWrite}
          parcoursId={parcours.id}
          data={parcours.formationSessions.map(
            (formationSession): FormationSessionRow => ({
              id: formationSession.id,
              titre: formationSession.titre,
              sequences: formationSession.sequences.map(
                (s): SequenceRow => ({
                  id: s.id,
                  titre: s.titre,
                  type: s.type,
                  date: s.date.toISOString(),
                  demiJournees: s.demiJournees,
                  heures: s.heures.toString(),
                  montantHT: s.montantHT,
                  preuveType: s.preuveType,
                  lieu: s.lieu,
                  address: s.address,
                  postalCode: s.postalCode,
                  city: s.city,
                  visioLink: s.visioLink,
                  formateurName: s.formateur ? `${s.formateur.firstName} ${s.formateur.lastName}` : null,
                }),
              ),
            }),
          )}
        />
      )}

      {activeTab === 'contractualisations' && (
        <ContractualisationsTable
          canWrite={canWrite}
          parcoursId={parcours.id}
          data={parcours.contractualisations.map((c): ContractualisationRow => {
            const payerName =
              c.payerClient?.companyName ??
              (c.payerParticipant ? `${c.payerParticipant.firstName} ${c.payerParticipant.lastName}` : null) ??
              c.financeur?.name ??
              '—'
            const paymentTrigger =
              c.payerType === 'INDIVIDU' && c.retractationEndsAt && parcours.dateDebut
                ? computePaymentTriggerDate(parcours.dateDebut, c.retractationEndsAt)
                : null
            return {
              id: c.id,
              payerType: c.payerType,
              payerName,
              status: c.status,
              montantHT: c.montantHT,
              participantsCount: c._count.participants,
              isPublicSectorClient: c.payerClient?.isPublicSector ?? false,
              numeroEngagement: c.numeroEngagement,
              codeService: c.codeService,
              retractationEndsAt: c.payerType === 'INDIVIDU' && c.retractationEndsAt ? c.retractationEndsAt.toISOString() : null,
              paymentTriggerDate: paymentTrigger ? paymentTrigger.toISOString() : null,
              financements: c.financements.map((f) => ({
                id: f.id,
                type: f.type,
                financeurName: f.financeur?.name ?? null,
                dossierNumber: f.dossierNumber,
                montantPrisEnCharge: f.montantPrisEnCharge,
              })),
              documents: c.documents.map((d) => ({
                id: d.id,
                type: d.type,
                signatureStatus: d.signatureStatus,
                isVoid: d.isVoid,
              })),
            }
          })}
        />
      )}

      {activeTab === 'participants' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-5)' }}>
            {canWrite && (
              <Button render={<Link href={`/parcours/${parcours.id}/participants/nouveau`} />} nativeButton={false} size="sm">
                Inscrire un participant
              </Button>
            )}
          </div>

          {parcours.participants.length === 0 ? (
            <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
              Aucun participant inscrit.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {parcours.participants.map((pp) => (
                <Card key={pp.id}>
                  <CardContent style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                          {pp.participant.firstName} {pp.participant.lastName}
                        </span>
                        <Badge variant="secondary">{PARTICIPANT_STATUS_LABELS[pp.status] ?? pp.status}</Badge>
                        {pp.besoinAccessibilite && (
                          <Badge variant={pp.adaptationTraceeAt ? 'accent' : 'destructive'}>
                            {pp.adaptationTraceeAt ? 'Accessibilité tracée' : 'Accessibilité NON tracée'}
                          </Badge>
                        )}
                      </div>
                      <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                        {pp.contractualisation ? PAYER_TYPE_LABELS[pp.contractualisation.payerType] : 'Aucun payeur assigné'} ·{' '}
                        {pp.hoursAttended.toString()}h assistées
                        {pp.status === 'ABANDON' && pp.abandonReason && <> · {pp.abandonReason}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <ParticipantConvocationMenu
                          parcoursId={parcours.id}
                          parcoursParticipantId={pp.id}
                          canGenerate={!!pp.contractualisation && isContractualisationAtLeast(pp.contractualisation.status, 'CONVENTION_SIGNEE')}
                          document={pp.documents[0] ? { id: pp.documents[0].id } : null}
                          convocationStatus={pp.convocationStatus}
                        />
                      )}
                      {canWrite && (
                        <Button render={<Link href={`/parcours/${parcours.id}/participants/${pp.id}/modifier`} />} nativeButton={false} variant="ghost" size="sm">
                          Gérer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'facturation' && (
        <FacturationTable
          canWrite={canWrite}
          parcoursId={parcours.id}
          data={parcours.contractualisations.map((c): FacturationGroupRow => {
            const payerName =
              c.payerClient?.companyName ??
              (c.payerParticipant ? `${c.payerParticipant.firstName} ${c.payerParticipant.lastName}` : null) ??
              c.financeur?.name ??
              '—'
            return {
              contractualisationId: c.id,
              payerName,
              payerType: c.payerType,
              isPublicSectorClient: c.payerClient?.isPublicSector ?? false,
              canCreateFacture: isContractualisationAtLeast(c.status, 'CONVENTION_SIGNEE'),
              totalSequences: realizedSequenceCount,
              invoicedSequences: c.factures.reduce((n, f) => n + f.sequences.length, 0),
              factures: c.factures.map((f) => {
                const dates = f.sequences.map((s) => s.date).sort((a, b) => a.getTime() - b.getTime())
                const first = dates[0]
                const last = dates[dates.length - 1]
                const periodLabel = !first || !last ? '—' : first.getTime() === last.getTime() ? first.toLocaleDateString('fr-FR') : `${first.toLocaleDateString('fr-FR')} – ${last.toLocaleDateString('fr-FR')}`
                return {
                  id: f.id,
                  montantHT: f.montantHT,
                  sequenceCount: f.sequences.length,
                  periodLabel,
                  documentId: f.documents.find((d) => d.type === 'FACTURE')?.id ?? null,
                  certificatDocumentId: f.documents.find((d) => d.type === 'CERTIFICAT_REALISATION')?.id ?? null,
                  sentAt: f.sentAt ? f.sentAt.toISOString() : null,
                  chorusProSentAt: f.chorusProSentAt ? f.chorusProSentAt.toISOString() : null,
                  paidAt: f.paidAt ? f.paidAt.toISOString() : null,
                }
              }),
            }
          })}
        />
      )}

      {activeTab === 'envois' && (
        <>
          <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
            🔴 Envoi simulé — aucun compte Brevo réel n&apos;est branché. Les boutons « Simuler » jouent le rôle
            d&apos;un webhook de livraison, pour montrer la règle qui compte : un échec ne s&apos;affiche JAMAIS en
            vert.
          </p>

          {messages.length === 0 ? (
            <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
              Aucun envoi pour le moment — utilisez « Envoyer par email » sur un participant, onglet Participants.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <Card key={m.id}>
                  <CardContent style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                          {m.subject}
                        </span>
                        <Badge variant={deliveryStatusBadgeVariant(m.deliveryStatus)}>
                          {DELIVERY_STATUS_LABELS[m.deliveryStatus] ?? m.deliveryStatus}
                        </Badge>
                      </div>
                      <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                        {m.recipientEmail}
                        {m.deliveryStatus === 'SOFT_BOUNCE' && <> · tentative {m.retryCount}/2 avant escalade</>}
                        {m.deliveredAt && <> · livré le {new Date(m.deliveredAt).toLocaleString('fr-FR')}</>}
                        {m.bouncedAt && !m.deliveredAt && <> · échec le {new Date(m.bouncedAt).toLocaleString('fr-FR')}</>}
                      </p>
                    </div>
                    {canWrite && ['SENT', 'SOFT_BOUNCE'].includes(m.deliveryStatus) && (
                      <div className="flex gap-2">
                        {[
                          { outcome: 'DELIVERED', label: 'Simuler : livré' },
                          { outcome: 'HARD_BOUNCE', label: 'Simuler : échec dur' },
                          { outcome: 'SOFT_BOUNCE', label: 'Simuler : bounce doux' },
                        ].map((sim) => (
                          <form key={sim.outcome} action={simulateDeliveryAction}>
                            <input type="hidden" name="messageId" value={m.id} />
                            <input type="hidden" name="parcoursId" value={parcours.id} />
                            <input type="hidden" name="outcome" value={sim.outcome} />
                            <Button type="submit" variant="ghost" size="sm">
                              {sim.label}
                            </Button>
                          </form>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'formateurs' && canWrite && (
        <FormateursOnParcoursTable canWrite={canWrite} parcoursId={parcours.id} data={formateurRows} />
      )}
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-caption-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      <div className="t-body-sm">{value}</div>
    </div>
  )
}
