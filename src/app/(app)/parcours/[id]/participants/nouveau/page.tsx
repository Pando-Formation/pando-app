import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { PAYER_TYPE_LABELS } from '@/lib/participant-labels'
import { EnrollParticipantForm } from '@/components/participants/EnrollParticipantForm'
import { enrollParticipantAction } from '@/app/(app)/parcours/actions'

export default async function EnrollParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const [parcours, participants, contractualisations] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.participant.findMany({ orderBy: { lastName: 'asc' } }),
    db.contractualisation.findMany({
      where: { parcoursId: id },
      include: { payerClient: { select: { companyName: true } }, financeur: { select: { name: true } } },
    }),
  ])
  if (!parcours) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Inscrire un participant
      </h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <EnrollParticipantForm
          action={enrollParticipantAction}
          parcoursId={parcours.id}
          participants={participants.map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName} (${p.email})` }))}
          contractualisations={contractualisations.map((c) => ({
            id: c.id,
            label: `${PAYER_TYPE_LABELS[c.payerType] ?? c.payerType} — ${c.payerClient?.companyName ?? c.financeur?.name ?? 'individuel'}`,
          }))}
        />
      </div>
    </>
  )
}
