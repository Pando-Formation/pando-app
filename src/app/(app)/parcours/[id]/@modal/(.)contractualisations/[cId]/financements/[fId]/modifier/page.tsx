import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { centsToEuroInput } from '@/lib/money'
import { Modal } from '@/components/ui/Modal'
import { FinancementForm, type FinancementDefaultValues } from '@/components/parcours/FinancementForm'
import { updateFinancementAction } from '@/app/(app)/parcours/actions'

export default async function EditFinancementModal({ params }: { params: Promise<{ id: string; cId: string; fId: string }> }) {
  const { id, cId, fId } = await params
  await requireAdmin()

  const [parcours, financement, financeurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.financement.findUnique({ where: { id: fId } }),
    db.financeur.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!parcours || !financement || financement.contractualisationId !== cId) notFound()

  const defaultValues: FinancementDefaultValues = {
    type: financement.type,
    financeurId: financement.financeurId ?? '',
    dossierNumber: financement.dossierNumber ?? '',
    montantPrisEnChargeEuros: centsToEuroInput(financement.montantPrisEnCharge),
  }

  return (
    <Modal path={`/parcours/${id}/contractualisations/${cId}/financements/${fId}/modifier`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-6)' }}>
        Modifier le financement
      </h2>
      <FinancementForm
        mode="edit"
        action={updateFinancementAction}
        parcoursId={parcours.id}
        contractualisationId={cId}
        financementId={financement.id}
        defaultValues={defaultValues}
        financeurs={financeurs.map((f) => ({ id: f.id, label: f.name }))}
      />
    </Modal>
  )
}
