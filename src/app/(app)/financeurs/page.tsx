import { requireAdmin, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FinanceurForm } from '@/components/participants/FinanceurForm'
import { createFinanceurAction } from '@/app/(app)/financeurs/actions'

export default async function FinanceursPage() {
  const session = await requireAdmin()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const financeurs = await db.financeur.findMany({ orderBy: { name: 'asc' } })

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Financeurs
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Financeurs (OPCO)
      </h1>

      {canWrite && (
        <div className="card" style={{ maxWidth: 560, marginBottom: 'var(--space-8)' }}>
          <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
            Nouveau financeur
          </h2>
          <FinanceurForm action={createFinanceurAction} />
        </div>
      )}

      {financeurs.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun financeur pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {financeurs.map((f) => (
            <div key={f.id} className="card">
              <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                {f.name}
              </span>
              <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                {f.type ?? 'Type non renseigné'} {f.siret && <>· {f.siret}</>}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
