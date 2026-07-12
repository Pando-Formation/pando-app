import Link from 'next/link'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { CONTRACT_TYPE_LABELS } from '@/lib/formateur-labels'
import { formateurDayCost, euros } from '@/lib/money'
import { competenceStatus } from '@/lib/formateur'

export default async function FormateursListPage() {
  await requireAdmin()

  const formateurs = await db.formateur.findMany({
    where: { deletedAt: null },
    orderBy: { lastName: 'asc' },
    include: { competences: true },
  })

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
            Formateurs
          </div>
          <h1 className="t-title-2">Formateurs</h1>
        </div>
        <Link href="/formateurs/nouveau" className="btn btn-md btn-primary">
          Nouveau formateur
        </Link>
      </div>

      {formateurs.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun formateur pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {formateurs.map((f) => {
            const dayCost = formateurDayCost({
              contractType: f.contractType,
              tarifJour: f.tarifJour,
              tvaRate: Number(f.tvaRate),
              forfaitDeplacement: f.forfaitDeplacement,
            })
            const hasExpiryWarning = f.competences.some((c) => {
              const status = competenceStatus(c.expiresAt)
              return status === 'expired' || status === 'expiring_soon'
            })

            return (
              <Link
                key={f.id}
                href={`/formateurs/${f.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                      {f.firstName} {f.lastName}
                    </span>
                    <span className="badge badge-neutral">{CONTRACT_TYPE_LABELS[f.contractType]}</span>
                    {hasExpiryWarning && <span className="badge badge-warning">Certification à vérifier</span>}
                  </div>
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    {f.email} · Coût réel : {euros(dayCost)}/jour
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
