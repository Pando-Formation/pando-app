import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ParticipantForm } from '@/components/participants/ParticipantForm'
import { createParticipantAction } from '@/app/(app)/participants/actions'

export default async function NewParticipantPage() {
  await requireOperational()

  const clients = await db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } })

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Participants
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouveau participant
      </h1>

      <ParticipantForm
        mode="create"
        action={createParticipantAction}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
      />
    </>
  )
}
