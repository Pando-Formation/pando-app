import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { SequenceForm, type SequenceDefaultValues } from '@/components/parcours/SequenceForm'
import { updateSequenceAction } from '@/app/(app)/parcours/actions'

export default async function EditSequencePage({ params }: { params: Promise<{ id: string; seqId: string }> }) {
  const { id, seqId } = await params
  await requireAdmin()

  const [parcours, sequence, formateurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.sequence.findUnique({ where: { id: seqId } }),
    db.formateur.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } }),
  ])
  if (!parcours || !sequence) notFound()

  const defaultValues: SequenceDefaultValues = {
    ordre: sequence.ordre.toString(),
    titre: sequence.titre,
    type: sequence.type,
    date: sequence.date.toISOString().slice(0, 10),
    demiJournees: sequence.demiJournees,
    heures: sequence.heures.toString(),
    lieu: sequence.lieu ?? '',
    preuveType: sequence.preuveType,
    formateurId: sequence.formateurId,
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier la séquence #{sequence.ordre}
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <SequenceForm
          mode="edit"
          action={updateSequenceAction}
          parcoursId={parcours.id}
          sequenceId={sequence.id}
          defaultValues={defaultValues}
          formateurs={formateurs.map((f) => ({ id: f.id, label: `${f.firstName} ${f.lastName}` }))}
          nextOrdre={sequence.ordre}
        />
      </div>
    </>
  )
}
