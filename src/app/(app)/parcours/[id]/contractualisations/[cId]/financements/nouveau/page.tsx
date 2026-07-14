import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { FinancementForm } from '@/components/parcours/FinancementForm'
import { addFinancementAction } from '@/app/(app)/parcours/actions'

export default async function NewFinancementPage({ params }: { params: Promise<{ id: string; cId: string }> }) {
  const { id, cId } = await params
  await requireAdmin()

  const [parcours, contractualisation, financeurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.contractualisation.findUnique({ where: { id: cId }, select: { id: true } }),
    db.financeur.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!parcours || !contractualisation) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Ajouter un financement
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <FinancementForm
          mode="create"
          action={addFinancementAction}
          parcoursId={parcours.id}
          contractualisationId={contractualisation.id}
          financeurs={financeurs.map((f) => ({ id: f.id, label: f.name }))}
        />
      </div>
    </>
  )
}
