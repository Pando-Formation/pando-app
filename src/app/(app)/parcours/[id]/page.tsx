import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros } from '@/lib/money'
import {
  TRACK_LABELS,
  PARCOURS_STATUS_LABELS,
  PANDO_ROLE_LABELS,
  SEQUENCE_TYPE_LABELS,
  PREUVE_TYPE_LABELS,
  DEMI_JOURNEE_LABELS,
} from '@/lib/parcours-labels'
import { deleteSequenceAction } from '@/app/(app)/parcours/actions'
import type { FormationSnapshot } from '@/lib/formation'

export default async function ParcoursDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const parcours = await db.parcours.findUnique({
    where: { id },
    include: {
      formationVersion: true,
      client: { select: { companyName: true } },
      beneficiaire: { select: { companyName: true } },
      donneurOrdre: { select: { companyName: true } },
      sequences: { orderBy: { ordre: 'asc' }, include: { formateur: { select: { firstName: true, lastName: true } } } },
      _count: { select: { participants: true, contractualisations: true } },
    },
  })
  if (!parcours) notFound()

  const snapshot = parcours.formationVersion.snapshot as unknown as FormationSnapshot

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
            Parcours
          </div>
          <h1 className="t-title-2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {parcours.reference}
            <span className="badge badge-neutral">{PARCOURS_STATUS_LABELS[parcours.status] ?? parcours.status}</span>
          </h1>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            {snapshot.title} (v{parcours.formationVersion.version})
          </p>
        </div>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/modifier`} className="btn btn-md btn-secondary">
            Modifier
          </Link>
        )}
      </div>

      {parcours.status === 'ANNULE' && parcours.cancellationReason && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-6)' }}>
          <span className="badge badge-danger">Annulé</span>
          <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
            {parcours.cancellationReason}
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Cadre
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <Field label="Track" value={TRACK_LABELS[parcours.track] ?? parcours.track} />
          <Field label="Rôle PANDO" value={PANDO_ROLE_LABELS[parcours.pandoRole] ?? parcours.pandoRole} />
          <Field label="Client" value={parcours.client?.companyName ?? '— (inter)'} />
          <Field label="Bénéficiaire" value={parcours.beneficiaire?.companyName ?? '—'} />
          {parcours.pandoRole === 'SOUS_TRAITANT' && (
            <Field label="Donneur d'ordre" value={parcours.donneurOrdre?.companyName ?? '—'} />
          )}
          <Field
            label="Effectif"
            value={
              parcours.minParticipants || parcours.maxParticipants
                ? `${parcours.minParticipants ?? '?'} – ${parcours.maxParticipants ?? '?'}`
                : '—'
            }
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Dérivé des séquences — lecture seule
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <Field label="Début" value={parcours.dateDebut ? new Date(parcours.dateDebut).toLocaleDateString('fr-FR') : '—'} />
          <Field label="Fin" value={parcours.dateFin ? new Date(parcours.dateFin).toLocaleDateString('fr-FR') : '—'} />
          <Field label="Durée totale" value={`${parcours.totalHours.toString()} h`} />
          <Field label="Montant HT" value={euros(parcours.montantHT)} />
        </div>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Aucun champ ci-dessus n&apos;est saisi à la main — modifier une séquence recalcule automatiquement ces
          quatre valeurs.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h2 className="t-heading">Séquences ({parcours.sequences.length})</h2>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/sequences/nouveau`} className="btn btn-sm btn-primary">
            Ajouter une séquence
          </Link>
        )}
      </div>

      {parcours.sequences.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucune séquence — les dates et la durée totale resteront vides tant qu&apos;aucune n&apos;est ajoutée.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {parcours.sequences.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="t-caption-1">#{s.ordre}</span>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {s.titre}
                  </span>
                  <span className="badge badge-neutral">{SEQUENCE_TYPE_LABELS[s.type] ?? s.type}</span>
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {new Date(s.date).toLocaleDateString('fr-FR')} ·{' '}
                  {s.demiJournees.map((dj) => DEMI_JOURNEE_LABELS[dj] ?? dj).join(' + ')} · {s.heures.toString()}h ·{' '}
                  preuve : {PREUVE_TYPE_LABELS[s.preuveType] ?? s.preuveType}
                  {s.lieu && <> · {s.lieu}</>}
                  {s.formateur && (
                    <>
                      {' '}
                      · {s.formateur.firstName} {s.formateur.lastName}
                    </>
                  )}
                </p>
              </div>
              {canWrite && (
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Link href={`/parcours/${parcours.id}/sequences/${s.id}/modifier`} className="btn btn-sm btn-ghost">
                    Modifier
                  </Link>
                  <form action={deleteSequenceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="parcoursId" value={parcours.id} />
                    <button type="submit" className="btn btn-sm btn-ghost">
                      Retirer
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="t-caption-1" style={{ marginTop: 'var(--space-6)' }}>
        {parcours._count.participants} participant{parcours._count.participants > 1 ? 's' : ''} ·{' '}
        {parcours._count.contractualisations} contractualisation{parcours._count.contractualisations > 1 ? 's' : ''}
      </p>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-caption-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      <div className="t-body-sm">{value}</div>
    </div>
  )
}
