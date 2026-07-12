import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { CONTRACT_TYPE_LABELS, COMPETENCE_TYPE_LABELS } from '@/lib/formateur-labels'
import { formateurDayCost, euros } from '@/lib/money'
import { competenceStatus } from '@/lib/formateur'
import { archiveFormateurAction, restoreFormateurAction } from '@/app/(app)/formateurs/actions'

const STATUS_BADGE: Record<string, string> = {
  expired: 'badge-danger',
  expiring_soon: 'badge-warning',
  ok: 'badge-success',
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
            Formateurs
          </div>
          <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
            {formateur.firstName} {formateur.lastName}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <span className="badge badge-neutral">{CONTRACT_TYPE_LABELS[formateur.contractType]}</span>
            <span className="badge badge-accent">Coût réel : {euros(dayCost)}/jour</span>
            {formateur.deletedAt && <span className="badge badge-danger">Archivé</span>}
          </div>
        </div>

        <Link href={`/formateurs/${formateur.id}/modifier`} className="btn btn-md btn-primary">
          Modifier
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-7)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
              Détails
            </h2>
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
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {formateur.expertises.map((e) => (
                    <span key={e} className="badge badge-neutral">
                      {e}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <form action={formateur.deletedAt ? restoreFormateurAction : archiveFormateurAction}>
              <input type="hidden" name="id" value={formateur.id} />
              <button type="submit" className={`btn btn-sm ${formateur.deletedAt ? 'btn-secondary' : 'btn-danger'}`}>
                {formateur.deletedAt ? 'Réactiver' : 'Archiver'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 className="t-heading">Compétences</h2>
            <Link href={`/formateurs/${formateur.id}/competences/nouveau`} className="btn btn-sm btn-secondary">
              + Ajouter
            </Link>
          </div>

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
                      <span className={`badge ${STATUS_BADGE[status]}`} style={{ marginTop: 'var(--space-2)' }}>
                        {STATUS_LABEL[status]} — {new Date(c.expiresAt!).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
