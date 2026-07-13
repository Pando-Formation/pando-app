import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS } from '@/lib/catalogue-labels'
import { archiveFormationAction, restoreFormationAction } from '@/app/(app)/catalogue/formations/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'

export default async function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const canWrite = hasRole(session, 'SUPER_ADMIN')

  const formation = await db.formation.findUnique({
    where: { id },
    include: {
      specialite: { include: { groupe: true, champs: true } },
      versions: { orderBy: { version: 'desc' } },
    },
  })
  if (!formation) notFound()

  const latestVersion = formation.versions[0]

  return (
    <>
      <PageHero>
        <div className="flex items-start justify-between">
          <div>
            <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
              Catalogue · {formation.internalCode}
            </div>
            <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
              {formation.title}
            </h1>
            <div className="flex gap-2">
              {formation.brandProgramme && (
                <Badge variant="accent">{BRAND_PROGRAMME_LABELS[formation.brandProgramme] ?? formation.brandProgramme}</Badge>
              )}
              {!formation.isActive && <Badge variant="secondary">Archivée</Badge>}
              {formation.requiresFullCohort && <Badge variant="warning">Collectif complet requis</Badge>}
            </div>
          </div>

          <div className="flex gap-3">
            {latestVersion && (
              <Button
                render={<a href={`/api/formations/${formation.id}/programme`} target="_blank" rel="noreferrer" />} nativeButton={false}
                variant="secondary"
              >
                Générer le programme (PDF)
              </Button>
            )}
            {canWrite && <Button render={<Link href={`/catalogue/formations/${formation.id}/modifier`} />} nativeButton={false}>Modifier</Button>}
          </div>
        </div>
      </PageHero>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-7)' }}>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <Field label="Durée" value={`${formation.durationHours.toString()}h · ${formation.durationDays.toString()}j`} />
                <Field label="Format" value={FORMAT_LABELS[formation.format] ?? formation.format} />
                <Field label="Public visé" value={formation.targetAudience} full />
                <Field label="Prérequis" value={formation.prerequisites} full />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objectifs pédagogiques</CardTitle>
            </CardHeader>
            <CardContent>
              <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {formation.pedagogicObjectives.map((o, i) => (
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
              <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Field label="Délai d'accès" value={formation.delaiAcces} full />
                <Field label="Accessibilité" value={formation.accessibilite} full />
              </dl>
            </CardContent>
          </Card>

          {formation.specialite && (
            <Card>
              <CardHeader>
                <CardTitle>Spécialité NSF</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="t-body-sm">
                  {formation.specialite.code} — {formation.specialite.titre}
                </p>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  Groupe {formation.specialite.groupe.titre} · Champs {formation.specialite.champs.titre}
                </p>
              </CardContent>
            </Card>
          )}

          {canWrite && (
            <Card>
              <CardContent>
                <form action={formation.isActive ? archiveFormationAction : restoreFormationAction}>
                  <input type="hidden" name="id" value={formation.id} />
                  <Button type="submit" variant={formation.isActive ? 'destructive' : 'secondary'} size="sm">
                    {formation.isActive ? 'Archiver' : 'Réactiver'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique des versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {formation.versions.map((v) => (
                <Link
                  key={v.id}
                  href={`/catalogue/formations/${formation.id}/versions/${v.version}`}
                  className="t-body-sm"
                  style={{ color: 'var(--color-accent-hover)' }}
                >
                  v{v.version} — {new Date(v.effectiveFrom).toLocaleDateString('fr-FR')}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div className="t-caption-1" style={{ marginBottom: 'var(--space-1)' }}>
        {label}
      </div>
      <div className="t-body-sm">{value}</div>
    </div>
  )
}
