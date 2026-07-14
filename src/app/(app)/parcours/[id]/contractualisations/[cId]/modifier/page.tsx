import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { ContractualisationForm, type ContractualisationDefaultValues } from '@/components/participants/ContractualisationForm'
import { updateContractualisationAction } from '@/app/(app)/parcours/actions'

export default async function EditContractualisationPage({ params }: { params: Promise<{ id: string; cId: string }> }) {
  const { id, cId } = await params
  await requireAdmin()

  const [parcours, contract, clients, participants, financeurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.contractualisation.findUnique({ where: { id: cId } }),
    db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } }),
    db.participant.findMany({ orderBy: { lastName: 'asc' } }),
    db.financeur.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!parcours || !contract) notFound()

  const defaultValues: ContractualisationDefaultValues = {
    payerType: contract.payerType,
    payerId: contract.payerClientId ?? contract.payerParticipantId ?? contract.financeurId ?? '',
    delaiReglement: contract.delaiReglement?.toString() ?? '',
    numeroEngagement: contract.numeroEngagement ?? '',
    codeService: contract.codeService ?? '',
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier la contractualisation
      </h1>

      <div className="card" style={{ maxWidth: 720 }}>
        <ContractualisationForm
          mode="edit"
          action={updateContractualisationAction}
          parcoursId={parcours.id}
          contractualisationId={contract.id}
          defaultValues={defaultValues}
          clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
          participants={participants.map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }))}
          financeurs={financeurs.map((f) => ({ id: f.id, label: f.name }))}
        />
      </div>
    </>
  )
}
