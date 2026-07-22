import Link from 'next/link'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros } from '@/lib/money'
import { TRACK_LABELS, PARCOURS_STATUS_LABELS, PANDO_ROLE_LABELS } from '@/lib/parcours-labels'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'

const TRACK_TABS = [
  { id: 'INTER', label: 'Inter' },
  { id: 'INTRA', label: 'Intra' },
] as const
type TrackTabId = (typeof TRACK_TABS)[number]['id']

export default async function ParcoursListPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const { track } = await searchParams
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))
  const activeTrack: TrackTabId = TRACK_TABS.some((t) => t.id === track) ? (track as TrackTabId) : 'INTER'

  const [parcours, trackCounts] = await Promise.all([
    db.parcours.findMany({
      where: { deletedAt: null, track: activeTrack },
      orderBy: { createdAt: 'desc' },
      include: {
        formationVersion: { select: { snapshot: true } },
        client: { select: { companyName: true } },
        _count: { select: { sequences: true } },
      },
    }),
    db.parcours.groupBy({
      by: ['track'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ])
  const counts = Object.fromEntries(trackCounts.map((c) => [c.track, c._count._all])) as Partial<Record<TrackTabId, number>>

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

      <nav
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border-subtle)',
          marginBottom: 'var(--space-7)',
        }}
      >
        {TRACK_TABS.map((t) => {
          const isActive = t.id === activeTrack
          return (
            <Link
              key={t.id}
              href={`/parcours?track=${t.id}`}
              className="t-nav-m"
              style={{
                display: 'inline-block',
                padding: 'var(--space-4) 0',
                marginBottom: '-1px',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                textDecoration: 'none',
              }}
            >
              {t.label}
              <span className="t-caption-1"> ({counts[t.id] ?? 0})</span>
            </Link>
          )
        })}
      </nav>

      {parcours.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun parcours {(TRACK_LABELS[activeTrack] ?? activeTrack).toLowerCase()} pour le moment.
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
