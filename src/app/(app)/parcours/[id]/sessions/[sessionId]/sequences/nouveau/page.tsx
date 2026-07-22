import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { SequenceForm } from '@/components/parcours/SequenceForm'
import { addSequenceAction } from '@/app/(app)/parcours/actions'

export default async function NewSessionSequencePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  await requireAdmin()

  const [session, formateurs] = await Promise.all([
    db.formationSession.findFirst({
      where: { id: sessionId, parcoursId: id, deletedAt: null },
      include: { parcours: { select: { id: true, reference: true } } },
    }),
    db.formateur.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } }),
  ])
  if (!session) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {session.parcours.reference} · {session.titre}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle séquence
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <SequenceForm
          mode="create"
          action={addSequenceAction}
          parcoursId={session.parcours.id}
          formationSessionId={session.id}
          formateurs={formateurs.map((f) => ({ id: f.id, label: `${f.firstName} ${f.lastName}` }))}
        />
      </div>
    </>
  )
}
