import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { FormationSessionForm } from '@/components/parcours/FormationSessionForm'
import { addFormationSessionAction } from '@/app/(app)/parcours/actions'

export default async function NewFormationSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const parcours = await db.parcours.findUnique({ where: { id }, select: { id: true, reference: true } })
  if (!parcours) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {parcours.reference}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle session
      </h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <FormationSessionForm mode="create" action={addFormationSessionAction} parcoursId={parcours.id} />
      </div>
    </>
  )
}
