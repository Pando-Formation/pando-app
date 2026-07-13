import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS } from '@/lib/catalogue-labels'
import type { FormationSnapshot } from '@/lib/formation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHero } from '@/components/page-hero'

export default async function FormationVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>
}) {
  await requireSession()
  const { id, version } = await params

  const record = await db.formationVersion.findUnique({
    where: { formationId_version: { formationId: id, version: Number(version) } },
  })
  if (!record) notFound()

  // 🔴 Rendered ONLY from the frozen snapshot — never the live Formation row.
  const snapshot = record.snapshot as unknown as FormationSnapshot
  if (!snapshot || !Array.isArray(snapshot.pedagogicObjectives)) {
    return (
      <p className="t-body" style={{ color: 'var(--color-danger)' }}>
        Instantané invalide pour cette version — impossible de l&apos;afficher.
      </p>
    )
  }

  return (
    <>
      <Link href={`/catalogue/formations/${id}`} className="t-caption-1" style={{ display: 'inline-block', marginBottom: 'var(--space-5)' }}>
        ← Retour à la formation
      </Link>

      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Version {record.version} · figée le {new Date(record.effectiveFrom).toLocaleDateString('fr-FR')}
        </div>
        <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
          {snapshot.title}
        </h1>
        <div className="flex gap-2">
          {snapshot.brandProgramme && (
            <Badge variant="accent">{BRAND_PROGRAMME_LABELS[snapshot.brandProgramme] ?? snapshot.brandProgramme}</Badge>
          )}
          <Badge variant="secondary">Instantané figé — lecture seule</Badge>
        </div>
      </PageHero>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 720 }}>
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="t-body-sm">
              {snapshot.durationHours}h · {snapshot.durationDays}j · {FORMAT_LABELS[snapshot.format] ?? snapshot.format}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objectifs pédagogiques</CardTitle>
          </CardHeader>
          <CardContent>
            <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {snapshot.pedagogicObjectives.map((o, i) => (
                <li key={i} className="t-body-sm">
                  {o}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information du public</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="t-caption-1" style={{ marginBottom: 'var(--space-1)' }}>
              Délai d&apos;accès
            </div>
            <p className="t-body-sm" style={{ marginBottom: 'var(--space-4)' }}>
              {snapshot.delaiAcces}
            </p>
            <div className="t-caption-1" style={{ marginBottom: 'var(--space-1)' }}>
              Accessibilité
            </div>
            <p className="t-body-sm">{snapshot.accessibilite}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
