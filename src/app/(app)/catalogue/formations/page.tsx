import Link from 'next/link'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS } from '@/lib/catalogue-labels'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'

export default async function FormationsListPage() {
  const session = await requireSession()
  const canWrite = hasRole(session, 'SUPER_ADMIN')

  const formations = await db.formation.findMany({
    orderBy: { title: 'asc' },
    include: { _count: { select: { versions: true } } },
  })

  return (
    <>
      <PageHero>
        <div className="flex items-start justify-between">
          <div>
            <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
              Catalogue
            </div>
            <h1 className="t-title-2">Formations</h1>
          </div>
          {canWrite && <Button render={<Link href="/catalogue/formations/nouveau" />} nativeButton={false}>Nouvelle formation</Button>}
        </div>
      </PageHero>

      {formations.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucune formation pour le moment.
        </p>
      ) : (
        <Card className="bg-transparent rounded-none p-0 ring-0">
          <div className="divide-y divide-border">
            {formations.map((f) => (
              <Link
                key={f.id}
                href={`/catalogue/formations/${f.id}`}
                className="flex w-full items-center justify-between gap-4 p-6 transition-colors hover:bg-muted/20"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                      {f.title}
                    </span>
                    {!f.isActive && <Badge variant="secondary">Archivée</Badge>}
                    {f.requiresFullCohort && <Badge variant="warning">Collectif complet</Badge>}
                  </div>
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    {f.internalCode} · {FORMAT_LABELS[f.format] ?? f.format} · {f.durationHours.toString()}h ·{' '}
                    {f._count.versions} version{f._count.versions > 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
