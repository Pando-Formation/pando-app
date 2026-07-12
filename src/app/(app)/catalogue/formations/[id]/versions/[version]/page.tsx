import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS } from '@/lib/catalogue-labels'
import type { FormationSnapshot } from '@/lib/formation'

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

      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Version {record.version} · figée le {new Date(record.effectiveFrom).toLocaleDateString('fr-FR')}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
        {snapshot.title}
      </h1>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
        {snapshot.brandProgramme && (
          <span className="badge badge-accent">
            {BRAND_PROGRAMME_LABELS[snapshot.brandProgramme] ?? snapshot.brandProgramme}
          </span>
        )}
        <span className="badge badge-neutral">Instantané figé — lecture seule</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 720 }}>
        <div className="card">
          <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
            Détails
          </h2>
          <p className="t-body-sm">
            {snapshot.durationHours}h · {snapshot.durationDays}j · {FORMAT_LABELS[snapshot.format] ?? snapshot.format}
          </p>
        </div>

        <div className="card">
          <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
            Objectifs pédagogiques
          </h2>
          <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {snapshot.pedagogicObjectives.map((o, i) => (
              <li key={i} className="t-body-sm">
                {o}
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
            Information du public
          </h2>
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
        </div>
      </div>
    </>
  )
}
