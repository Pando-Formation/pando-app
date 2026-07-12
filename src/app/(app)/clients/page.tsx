import Link from 'next/link'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { CLIENT_STATUS_LABELS } from '@/lib/client-labels'

export default async function ClientsListPage() {
  const session = await requireSession()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { companyName: 'asc' },
    include: { _count: { select: { contacts: true } } },
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
            Clients
          </div>
          <h1 className="t-title-2">Clients</h1>
        </div>
        {canWrite && (
          <Link href="/clients/nouveau" className="btn btn-md btn-primary">
            Nouveau client
          </Link>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun client pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {c.companyName}
                  </span>
                  <span className="badge badge-neutral">{CLIENT_STATUS_LABELS[c.status] ?? c.status}</span>
                  {c.isPublicSector && <span className="badge badge-warning">Secteur public</span>}
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {c.siret ?? 'SIRET non renseigné'} · {c.city ?? 'ville non renseignée'} · {c._count.contacts}{' '}
                  contact{c._count.contacts > 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
