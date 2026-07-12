import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { ParcoursParticipantForm, type ParcoursParticipantDefaultValues } from '@/components/participants/ParcoursParticipantForm'
import { updateParcoursParticipantAction } from '@/app/(app)/parcours/actions'

export default async function EditParcoursParticipantPage({ params }: { params: Promise<{ id: string; ppId: string }> }) {
  const { id, ppId } = await params
  await requireAdmin()

  const [parcours, pp, referents] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.parcoursParticipant.findUnique({ where: { id: ppId }, include: { participant: true } }),
    db.user.findMany({ where: { roles: { hasSome: ['SUPER_ADMIN', 'ADMIN'] } } }),
  ])
  if (!parcours || !pp) notFound()

  const defaultValues: ParcoursParticipantDefaultValues = {
    status: pp.status,
    abandonReason: pp.abandonReason ?? '',
    besoinAccessibilite: pp.besoinAccessibilite ?? '',
    adaptationProposee: pp.adaptationProposee ?? '',
    adaptationTraceeAt: pp.adaptationTraceeAt?.toISOString() ?? null,
    referentHandicapId: pp.referentHandicapId,
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        {pp.participant.firstName} {pp.participant.lastName}
      </h1>

      <ParcoursParticipantForm
        action={updateParcoursParticipantAction}
        parcoursId={parcours.id}
        parcoursParticipantId={pp.id}
        participantName={`${pp.participant.firstName} ${pp.participant.lastName}`}
        defaultValues={defaultValues}
        referents={referents.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))}
      />
    </>
  )
}
