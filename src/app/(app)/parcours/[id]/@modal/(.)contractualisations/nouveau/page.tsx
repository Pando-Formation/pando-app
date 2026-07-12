import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { ContractualisationForm } from '@/components/participants/ContractualisationForm'
import { createContractualisationAction } from '@/app/(app)/parcours/actions'

export default async function NewContractualisationModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const [parcours, clients, participants, financeurs] = await Promise.all([
    db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } }),
    db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } }),
    db.participant.findMany({ orderBy: { lastName: 'asc' } }),
    db.financeur.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!parcours) notFound()

  return (
    <Modal path={`/parcours/${id}/contractualisations/nouveau`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-6)' }}>
        Nouvelle contractualisation
      </h2>
      <ContractualisationForm
        mode="create"
        action={createContractualisationAction}
        parcoursId={parcours.id}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
        participants={participants.map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }))}
        financeurs={financeurs.map((f) => ({ id: f.id, label: f.name }))}
      />
    </Modal>
  )
}
