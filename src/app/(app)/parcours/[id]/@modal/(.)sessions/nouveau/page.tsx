import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { FormationSessionForm } from '@/components/parcours/FormationSessionForm'
import { addFormationSessionAction } from '@/app/(app)/parcours/actions'

export default async function NewFormationSessionModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const parcours = await db.parcours.findUnique({ where: { id }, select: { id: true } })
  if (!parcours) notFound()

  return (
    <Modal path={`/parcours/${id}/sessions/nouveau`}>
      <h2 className="t-heading" style={{ marginBottom: 'var(--space-6)' }}>
        Nouvelle session
      </h2>
      <FormationSessionForm mode="create" action={addFormationSessionAction} parcoursId={parcours.id} />
    </Modal>
  )
}
