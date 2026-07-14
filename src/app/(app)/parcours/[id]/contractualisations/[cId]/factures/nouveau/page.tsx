import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { listInvoiceableSequences } from '@/lib/facturation'
import { FactureForm } from '@/components/parcours/FactureForm'
import { createFactureAction } from '@/app/(app)/parcours/facturation-actions'

export default async function NewFacturePage({ params }: { params: Promise<{ id: string; cId: string }> }) {
  const { id, cId } = await params
  await requireAdmin()

  const [parcours, contractualisation, sequences] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.contractualisation.findUnique({ where: { id: cId }, select: { id: true } }),
    listInvoiceableSequences(cId),
  ])
  if (!parcours || !contractualisation) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle facture
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <FactureForm
          action={createFactureAction}
          parcoursId={parcours.id}
          contractualisationId={contractualisation.id}
          invoiceableSequences={sequences.map((s) => ({
            id: s.id,
            titre: s.titre,
            date: s.date.toISOString(),
            heures: s.heures.toString(),
            montantHT: s.montantHT,
          }))}
        />
      </div>
    </>
  )
}
