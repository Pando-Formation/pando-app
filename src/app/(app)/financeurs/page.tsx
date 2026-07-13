import { requireAdmin, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FinanceurForm } from '@/components/participants/FinanceurForm'
import { createFinanceurAction } from '@/app/(app)/financeurs/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHero } from '@/components/page-hero'

export default async function FinanceursPage() {
  const session = await requireAdmin()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const financeurs = await db.financeur.findMany({ orderBy: { name: 'asc' } })

  return (
    <>
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Financeurs
        </div>
        <h1 className="t-title-2">Financeurs (OPCO)</h1>
      </PageHero>

      {canWrite && (
        <Card style={{ maxWidth: 560, marginBottom: 'var(--space-8)' }}>
          <CardHeader>
            <CardTitle>Nouveau financeur</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceurForm action={createFinanceurAction} />
          </CardContent>
        </Card>
      )}

      {financeurs.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun financeur pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {financeurs.map((f) => (
            <Card key={f.id}>
              <CardContent>
                <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                  {f.name}
                </span>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {f.type ?? 'Type non renseigné'} {f.siret && <>· {f.siret}</>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
