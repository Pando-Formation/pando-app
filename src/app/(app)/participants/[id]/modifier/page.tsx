import { notFound } from 'next/navigation'
import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ParticipantForm, type ParticipantDefaultValues } from '@/components/participants/ParticipantForm'
import { updateParticipantAction } from '@/app/(app)/participants/actions'

export default async function EditParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireOperational()

  const [participant, clients] = await Promise.all([
    db.participant.findUnique({ where: { id } }),
    db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } }),
  ])
  if (!participant) notFound()

  const defaultValues: ParticipantDefaultValues = {
    civilite: participant.civilite,
    firstName: participant.firstName,
    lastName: participant.lastName,
    email: participant.email,
    address: participant.address ?? '',
    postalCode: participant.postalCode ?? '',
    city: participant.city ?? '',
    fonction: participant.fonction ?? '',
    situation: participant.situation,
    clientId: participant.clientId,
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Participants
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {participant.firstName} {participant.lastName}
      </h1>

      <ParticipantForm
        mode="edit"
        action={updateParticipantAction}
        participantId={participant.id}
        defaultValues={defaultValues}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
      />
    </>
  )
}
