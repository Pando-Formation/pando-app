import Link from 'next/link'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { SITUATION_LABELS } from '@/lib/participant-labels'

export default async function ParticipantsListPage() {
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const participants = await db.participant.findMany({
    orderBy: { lastName: 'asc' },
    include: { client: { select: { companyName: true } }, _count: { select: { parcours: true } } },
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
            Participants
          </div>
          <h1 className="t-title-2">Participants</h1>
        </div>
        {canWrite && (
          <Link href="/participants/nouveau" className="btn btn-md btn-primary">
            Nouveau participant
          </Link>
        )}
      </div>

      {participants.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun participant pour le moment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {participants.map((p) => (
            <Link
              key={p.id}
              href={`/participants/${p.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="badge badge-neutral">{SITUATION_LABELS[p.situation] ?? p.situation}</span>
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {p.email} · {p.client?.companyName ?? 'Aucun employeur renseigné'} · {p._count.parcours} parcours
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
