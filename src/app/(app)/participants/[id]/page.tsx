import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { SITUATION_LABELS, PARTICIPANT_STATUS_LABELS } from '@/lib/participant-labels'

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const participant = await db.participant.findUnique({
    where: { id },
    include: {
      client: { select: { companyName: true } },
      parcours: {
        include: { parcours: { select: { id: true, reference: true, formationVersion: { select: { snapshot: true } } } } },
      },
    },
  })
  if (!participant) notFound()

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
          <h1 className="t-title-2">
            {participant.firstName} {participant.lastName}
          </h1>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            {participant.email} · {SITUATION_LABELS[participant.situation] ?? participant.situation} ·{' '}
            {participant.client?.companyName ?? 'Aucun employeur renseigné'}
          </p>
        </div>
        {canWrite && (
          <Link href={`/participants/${participant.id}/modifier`} className="btn btn-md btn-secondary">
            Modifier
          </Link>
        )}
      </div>

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Parcours ({participant.parcours.length})
      </h2>

      {participant.parcours.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Pas encore inscrit à un parcours.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {participant.parcours.map((pp) => {
            const snapshot = pp.parcours.formationVersion.snapshot as { title?: string }
            return (
              <Link
                key={pp.id}
                href={`/parcours/${pp.parcours.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                      {pp.parcours.reference}
                    </span>
                    <span className="badge badge-neutral">{PARTICIPANT_STATUS_LABELS[pp.status] ?? pp.status}</span>
                    {pp.besoinAccessibilite && (
                      <span className={`badge ${pp.adaptationTraceeAt ? 'badge-accent' : 'badge-danger'}`}>
                        {pp.adaptationTraceeAt ? 'Accessibilité tracée' : 'Accessibilité NON tracée'}
                      </span>
                    )}
                  </div>
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    {snapshot.title ?? 'Formation'} · {pp.hoursAttended.toString()}h assistées
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
