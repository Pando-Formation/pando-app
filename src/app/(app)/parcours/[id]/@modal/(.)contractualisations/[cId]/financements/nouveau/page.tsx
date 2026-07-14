import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { FinancementForm } from '@/components/parcours/FinancementForm'
import { addFinancementAction } from '@/app/(app)/parcours/actions'

export default async function NewFinancementModal({ params }: { params: Promise<{ id: string; cId: string }> }) {
  const { id, cId } = await params
  await requireAdmin()

  const [parcours, contractualisation, financeurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.contractualisation.findUnique({ where: { id: cId }, select: { id: true } }),
    db.financeur.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!parcours || !contractualisation) notFound()

  return (
    <Modal path={`/parcours/${id}/contractualisations/${cId}/financements/nouveau`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-6)' }}>
        Ajouter un financement
      </h2>
      <FinancementForm
        mode="create"
        action={addFinancementAction}
        parcoursId={parcours.id}
        contractualisationId={contractualisation.id}
        financeurs={financeurs.map((f) => ({ id: f.id, label: f.name }))}
      />
    </Modal>
  )
}
