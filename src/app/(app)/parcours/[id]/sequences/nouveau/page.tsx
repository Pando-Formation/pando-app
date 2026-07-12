import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { SequenceForm } from '@/components/parcours/SequenceForm'
import { addSequenceAction } from '@/app/(app)/parcours/actions'

export default async function NewSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const [parcours, formateurs, maxOrdre] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.formateur.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } }),
    db.sequence.aggregate({ where: { parcoursId: id }, _max: { ordre: true } }),
  ])
  if (!parcours) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle séquence
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <SequenceForm
          mode="create"
          action={addSequenceAction}
          parcoursId={parcours.id}
          formateurs={formateurs.map((f) => ({ id: f.id, label: `${f.firstName} ${f.lastName}` }))}
          nextOrdre={(maxOrdre._max.ordre ?? 0) + 1}
        />
      </div>
    </>
  )
}
