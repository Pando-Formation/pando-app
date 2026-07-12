import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { ParcoursForm } from '@/components/parcours/ParcoursForm'
import { createParcoursAction } from '@/app/(app)/parcours/actions'

export default async function NewParcoursPage() {
  await requireAdmin()

  const [formations, clients] = await Promise.all([
    db.formation.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }),
    db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } }),
  ])

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouveau parcours
      </h1>

      <ParcoursForm
        mode="create"
        action={createParcoursAction}
        formations={formations.map((f) => ({ id: f.id, label: `${f.internalCode} — ${f.title}` }))}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
      />
    </>
  )
}
