import Link from 'next/link'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS } from '@/lib/catalogue-labels'

export default async function FormationsListPage() {
  const session = await requireSession()
  const canWrite = hasRole(session, 'SUPER_ADMIN')

  const formations = await db.formation.findMany({
    orderBy: { title: 'asc' },
    include: { _count: { select: { versions: true } } },
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
            Catalogue
          </div>
          <h1 className="t-title-2">Formations</h1>
        </div>
        {canWrite && (
          <Link href="/catalogue/formations/nouveau" className="btn btn-md btn-primary">
            Nouvelle formation
          </Link>
        )}
      </div>

      {formations.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucune formation pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {formations.map((f) => (
            <Link
              key={f.id}
              href={`/catalogue/formations/${f.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {f.title}
                  </span>
                  {!f.isActive && <span className="badge badge-neutral">Archivée</span>}
                  {f.requiresFullCohort && <span className="badge badge-warning">Collectif complet</span>}
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {f.internalCode} · {FORMAT_LABELS[f.format] ?? f.format} · {f.durationHours.toString()}h ·{' '}
                  {f._count.versions} version{f._count.versions > 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
