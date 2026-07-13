import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { CONTRACT_TYPE_LABELS, COMPETENCE_TYPE_LABELS } from '@/lib/formateur-labels'
import { formateurDayCost, euros } from '@/lib/money'
import { competenceStatus } from '@/lib/formateur'
import { archiveFormateurAction, restoreFormateurAction } from '@/app/(app)/formateurs/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'
import type { VariantProps } from 'class-variance-authority'

const STATUS_BADGE_VARIANT: Record<string, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  expired: 'destructive',
  expiring_soon: 'warning',
  ok: 'success',
}
const STATUS_LABEL: Record<string, string> = {
  expired: 'Expirée',
  expiring_soon: 'Expire bientôt',
  ok: 'Valide',
}

export default async function FormateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const formateur = await db.formateur.findUnique({
    where: { id },
    include: { competences: { orderBy: { date: 'desc' } } },
  })
  if (!formateur) notFound()

  const dayCost = formateurDayCost({
    contractType: formateur.contractType,
    tarifJour: formateur.tarifJour,
    tvaRate: Number(formateur.tvaRate),
    forfaitDeplacement: formateur.forfaitDeplacement,
  })

  return (
    <>
      <PageHero>
        <div className="flex items-start justify-between">
          <div>
            <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
              Formateurs
            </div>
            <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
              {formateur.firstName} {formateur.lastName}
            </h1>
            <div className="flex gap-2">
              <Badge variant="secondary">{CONTRACT_TYPE_LABELS[formateur.contractType]}</Badge>
              <Badge variant="accent">Coût réel : {euros(dayCost)}/jour</Badge>
              {formateur.deletedAt && <Badge variant="destructive">Archivé</Badge>}
            </div>
          </div>

          <Button render={<Link href={`/formateurs/${formateur.id}/modifier`} />} nativeButton={false}>Modifier</Button>
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
                <Field label="E-mail" value={formateur.email} />
                <Field label="Téléphone" value={formateur.phone ?? '—'} />
                <Field label="SIREN" value={formateur.siren ?? '—'} />
                <Field label="NDA" value={formateur.nda ?? '—'} />
                <Field
                  label="Adresse"
                  value={[formateur.address, formateur.postalCode, formateur.city].filter(Boolean).join(', ') || '—'}
                  full
                />
                <Field label="Taux TVA" value={`${(Number(formateur.tvaRate) * 100).toFixed(0)}%`} />
                <Field
                  label="Tarif jour"
                  value={formateur.tarifJour !== null ? euros(formateur.tarifJour) : '—'}
                />
                <Field label="Forfait déplacement" value={euros(formateur.forfaitDeplacement)} />
                <Field label="Qualiopi" value={formateur.isQualiopiCertified ? 'Certifié' : 'Non certifié'} />
              </dl>
              {formateur.expertises.length > 0 && (
                <>
                  <div className="t-caption-1" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>
                    Expertise
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formateur.expertises.map((e) => (
                      <Badge key={e} variant="secondary">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <form action={formateur.deletedAt ? restoreFormateurAction : archiveFormateurAction}>
                <input type="hidden" name="id" value={formateur.id} />
                <Button type="submit" variant={formateur.deletedAt ? 'secondary' : 'destructive'} size="sm">
                  {formateur.deletedAt ? 'Réactiver' : 'Archiver'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Compétences</CardTitle>
            <Button render={<Link href={`/formateurs/${formateur.id}/competences/nouveau`} />} nativeButton={false} variant="secondary" size="sm">
              + Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {formateur.competences.length === 0 ? (
              <p className="t-caption-1">Aucune compétence enregistrée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {formateur.competences.map((c) => {
                  const status = competenceStatus(c.expiresAt)
                  return (
                    <div key={c.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4)' }}>
                      <div className="t-body-sm" style={{ fontWeight: 500 }}>
                        {c.title}
                      </div>
                      <div className="t-caption-1">
                        {COMPETENCE_TYPE_LABELS[c.type]} · {new Date(c.date).toLocaleDateString('fr-FR')}
                      </div>
                      {status && (
                        <Badge variant={STATUS_BADGE_VARIANT[status]} style={{ marginTop: 'var(--space-2)' }}>
                          {STATUS_LABEL[status]} — {new Date(c.expiresAt!).toLocaleDateString('fr-FR')}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
