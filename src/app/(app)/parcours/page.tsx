import Link from 'next/link'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros } from '@/lib/money'
import { TRACK_LABELS, PARCOURS_STATUS_LABELS, PANDO_ROLE_LABELS } from '@/lib/parcours-labels'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'

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
      <PageHero>
        <div className="flex items-start justify-between">
          <div>
            <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
              Parcours
            </div>
            <h1 className="t-title-2">Parcours &amp; séquences</h1>
          </div>
          {canWrite && <Button render={<Link href="/parcours/nouveau" />} nativeButton={false}>Nouveau parcours</Button>}
        </div>
      </PageHero>

      {parcours.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun parcours pour le moment.
        </p>
      ) : (
        <Card className="bg-transparent rounded-none p-0 ring-0">
          <div className="divide-y divide-border">
            {parcours.map((p) => {
              const snapshot = p.formationVersion.snapshot as { title?: string }
              return (
                <Link
                  key={p.id}
                  href={`/parcours/${p.id}`}
                  className="flex w-full items-center justify-between gap-4 p-6 transition-colors hover:bg-muted/20"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                        {p.reference}
                      </span>
                      <Badge variant="secondary">{PARCOURS_STATUS_LABELS[p.status] ?? p.status}</Badge>
                      <Badge variant="secondary">{TRACK_LABELS[p.track] ?? p.track}</Badge>
                      {p.pandoRole === 'SOUS_TRAITANT' && (
                        <Badge variant="warning">{PANDO_ROLE_LABELS[p.pandoRole]}</Badge>
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
        </Card>
      )}
    </>
  )
}
