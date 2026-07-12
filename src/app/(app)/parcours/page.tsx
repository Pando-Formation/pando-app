import Link from 'next/link'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros } from '@/lib/money'
import { TRACK_LABELS, PARCOURS_STATUS_LABELS, PANDO_ROLE_LABELS } from '@/lib/parcours-labels'

export default async function ParcoursListPage() {
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const parcours = await db.parcours.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      formationVersion: { select: { snapshot: true } },
      client: { select: { companyName: true } },
      _count: { select: { sequences: true } },
    },
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
            Parcours
          </div>
          <h1 className="t-title-2">Parcours &amp; séquences</h1>
        </div>
        {canWrite && (
          <Link href="/parcours/nouveau" className="btn btn-md btn-primary">
            Nouveau parcours
          </Link>
        )}
      </div>

      {parcours.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun parcours pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {parcours.map((p) => {
            const snapshot = p.formationVersion.snapshot as { title?: string }
            return (
              <Link
                key={p.id}
                href={`/parcours/${p.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                      {p.reference}
                    </span>
                    <span className="badge badge-neutral">{PARCOURS_STATUS_LABELS[p.status] ?? p.status}</span>
                    <span className="badge badge-neutral">{TRACK_LABELS[p.track] ?? p.track}</span>
                    {p.pandoRole === 'SOUS_TRAITANT' && (
                      <span className="badge badge-warning">{PANDO_ROLE_LABELS[p.pandoRole]}</span>
                    )}
                  </div>
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    {snapshot.title ?? 'Formation'} · {p.client?.companyName ?? 'Inter — pas de client'} ·{' '}
                    {p._count.sequences} séquence{p._count.sequences > 1 ? 's' : ''}
                    {p.dateDebut && p.dateFin && (
                      <>
                        {' '}
                        · {new Date(p.dateDebut).toLocaleDateString('fr-FR')} →{' '}
                        {new Date(p.dateFin).toLocaleDateString('fr-FR')}
                      </>
                    )}
                    {' · '}
                    {p.totalHours.toString()}h · {euros(p.montantHT)}
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
