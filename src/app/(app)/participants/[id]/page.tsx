import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { SITUATION_LABELS, PARTICIPANT_STATUS_LABELS } from '@/lib/participant-labels'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'

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
      <PageHero>
        <div className="flex items-start justify-between">
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
            <Button render={<Link href={`/participants/${participant.id}/modifier`} />} nativeButton={false} variant="secondary">
              Modifier
            </Button>
          )}
        </div>
      </PageHero>

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Parcours ({participant.parcours.length})
      </h2>

      {participant.parcours.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Pas encore inscrit à un parcours.
        </p>
      ) : (
        <Card className="bg-transparent rounded-none p-0 ring-0">
          <div className="divide-y divide-border">
            {participant.parcours.map((pp) => {
              const snapshot = pp.parcours.formationVersion.snapshot as { title?: string }
              return (
                <Link
                  key={pp.id}
                  href={`/parcours/${pp.parcours.id}`}
                  className="flex w-full items-center justify-between gap-4 p-6 transition-colors hover:bg-muted/20"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                        {pp.parcours.reference}
                      </span>
                      <Badge variant="secondary">{PARTICIPANT_STATUS_LABELS[pp.status] ?? pp.status}</Badge>
                      {pp.besoinAccessibilite && (
                        <Badge variant={pp.adaptationTraceeAt ? 'accent' : 'destructive'}>
                          {pp.adaptationTraceeAt ? 'Accessibilité tracée' : 'Accessibilité NON tracée'}
                        </Badge>
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
        </Card>
      )}
    </>
  )
}
