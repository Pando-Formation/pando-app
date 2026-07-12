import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS } from '@/lib/catalogue-labels'
import { archiveFormationAction, restoreFormationAction } from '@/app/(app)/catalogue/formations/actions'

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
            Catalogue · {formation.internalCode}
          </div>
          <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
            {formation.title}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {formation.brandProgramme && (
              <span className="badge badge-accent">
                {BRAND_PROGRAMME_LABELS[formation.brandProgramme] ?? formation.brandProgramme}
              </span>
            )}
            {!formation.isActive && <span className="badge badge-neutral">Archivée</span>}
            {formation.requiresFullCohort && <span className="badge badge-warning">Collectif complet requis</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {latestVersion && (
            <a
              href={`/api/formations/${formation.id}/programme`}
              className="btn btn-md btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              Générer le programme (PDF)
            </a>
          )}
          {canWrite && (
            <Link href={`/catalogue/formations/${formation.id}/modifier`} className="btn btn-md btn-primary">
              Modifier
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-7)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
              Détails
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="Durée" value={`${formation.durationHours.toString()}h · ${formation.durationDays.toString()}j`} />
              <Field label="Format" value={FORMAT_LABELS[formation.format] ?? formation.format} />
              <Field label="Public visé" value={formation.targetAudience} full />
              <Field label="Prérequis" value={formation.prerequisites} full />
            </dl>
          </div>

          <div className="card">
            <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
              Objectifs pédagogiques
            </h2>
            <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {formation.pedagogicObjectives.map((o, i) => (
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
            <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Field label="Délai d'accès" value={formation.delaiAcces} full />
              <Field label="Accessibilité" value={formation.accessibilite} full />
            </dl>
          </div>

          {formation.specialite && (
            <div className="card">
              <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
                Spécialité NSF
              </h2>
              <p className="t-body-sm">
                {formation.specialite.code} — {formation.specialite.titre}
              </p>
              <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                Groupe {formation.specialite.groupe.titre} · Champs {formation.specialite.champs.titre}
              </p>
            </div>
          )}

          {canWrite && (
            <div className="card">
              <form action={formation.isActive ? archiveFormationAction : restoreFormationAction}>
                <input type="hidden" name="id" value={formation.id} />
                <button type="submit" className={`btn btn-sm ${formation.isActive ? 'btn-danger' : 'btn-secondary'}`}>
                  {formation.isActive ? 'Archiver' : 'Réactiver'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
            Historique des versions
          </h2>
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
        </div>
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
