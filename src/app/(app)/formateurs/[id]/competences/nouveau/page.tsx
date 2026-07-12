import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { CompetenceForm } from '@/components/formateurs/CompetenceForm'
import { addCompetenceAction } from '@/app/(app)/formateurs/actions'

export default async function NewCompetencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const formateur = await db.formateur.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!formateur) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Formateurs · {formateur.firstName} {formateur.lastName}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle compétence
      </h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <CompetenceForm formateurId={formateur.id} action={addCompetenceAction} />
      </div>
    </>
  )
}
