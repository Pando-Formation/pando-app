import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { SequenceForm, type SequenceDefaultValues } from '@/components/parcours/SequenceForm'
import { updateSequenceAction } from '@/app/(app)/parcours/actions'

export default async function EditSequenceModal({ params }: { params: Promise<{ id: string; seqId: string }> }) {
  const { id, seqId } = await params
  await requireAdmin()

  const [parcours, sequence, formateurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.sequence.findUnique({ where: { id: seqId } }),
    db.formateur.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } }),
  ])
  if (!parcours || !sequence) notFound()

  const defaultValues: SequenceDefaultValues = {
    titre: sequence.titre,
    type: sequence.type,
    date: sequence.date.toISOString().slice(0, 10),
    demiJournees: sequence.demiJournees,
    heures: sequence.heures.toString(),
    lieu: sequence.lieu ?? '',
    address: sequence.address ?? '',
    postalCode: sequence.postalCode ?? '',
    city: sequence.city ?? '',
    preuveType: sequence.preuveType,
    formateurId: sequence.formateurId,
  }

  return (
    <Modal path={`/parcours/${id}/sequences/${seqId}/modifier`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-6)' }}>
        Modifier la séquence « {sequence.titre} »
      </h2>
      <SequenceForm
        mode="edit"
        action={updateSequenceAction}
        parcoursId={parcours.id}
        sequenceId={sequence.id}
        defaultValues={defaultValues}
        formateurs={formateurs.map((f) => ({ id: f.id, label: `${f.firstName} ${f.lastName}` }))}
      />
    </Modal>
  )
}
