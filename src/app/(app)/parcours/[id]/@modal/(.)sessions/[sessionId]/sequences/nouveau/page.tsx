import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { SequenceForm } from '@/components/parcours/SequenceForm'
import { addSequenceAction } from '@/app/(app)/parcours/actions'

export default async function NewSessionSequenceModal({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  await requireAdmin()

  const [session, formateurs] = await Promise.all([
    db.formationSession.findFirst({
      where: { id: sessionId, parcoursId: id, deletedAt: null },
      select: { id: true, titre: true, parcoursId: true },
    }),
    db.formateur.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } }),
  ])
  if (!session) notFound()

  return (
    <Modal path={`/parcours/${id}/sessions/${sessionId}/sequences/nouveau`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-2)' }}>
        Nouvelle séquence
      </h2>
      <p className="t-caption-1" style={{ marginBottom: 'var(--space-6)' }}>
        {session.titre}
      </p>
      <SequenceForm
        mode="create"
        action={addSequenceAction}
        parcoursId={session.parcoursId}
        formationSessionId={session.id}
        formateurs={formateurs.map((f) => ({ id: f.id, label: `${f.firstName} ${f.lastName}` }))}
      />
    </Modal>
  )
}
