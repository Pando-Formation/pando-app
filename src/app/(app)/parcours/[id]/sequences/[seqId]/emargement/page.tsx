import { notFound, redirect } from 'next/navigation'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { DEMI_JOURNEE_LABELS } from '@/lib/parcours-labels'
import { ATTENDANCE_STATUS_LABELS } from '@/lib/attendance-labels'
import { markAttendanceAction, counterSignAttendanceAction } from '@/app/(app)/parcours/attendance-actions'
import { AttendanceForm } from '@/components/participants/AttendanceForm'
import type { FormationSnapshot } from '@/lib/formation'
import type { DemiJournee } from '@prisma/client'

export default async function EmargementPage({ params }: { params: Promise<{ id: string; seqId: string }> }) {
  const { id, seqId } = await params
  const session = await requireSession()

  const sequence = await db.sequence.findUnique({
    where: { id: seqId },
    include: {
      formateur: { select: { firstName: true, lastName: true } },
      parcours: {
        include: {
          formationVersion: { select: { snapshot: true } },
          participants: { include: { participant: true }, orderBy: { createdAt: 'asc' } },
        },
      },
      attendances: true,
      documents: { select: { id: true, filename: true, type: true } },
    },
  })
  if (!sequence || sequence.parcoursId !== id) notFound()

  const isSuperAdminOrAdmin = hasRole(session, 'SUPER_ADMIN') || hasRole(session, 'ADMIN')
  const isAssignedFormateur = hasRole(session, 'FORMATEUR') && session.user.formateurId === sequence.formateurId
  if (!isSuperAdminOrAdmin && !isAssignedFormateur) redirect(`/parcours/${id}`)
  const canWrite = isSuperAdminOrAdmin || isAssignedFormateur

  const snapshot = sequence.parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const attendanceByKey = new Map(sequence.attendances.map((a) => [`${a.participantId}-${a.demiJournee}`, a]))

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours · {sequence.parcours.reference} · Émargement
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
        {sequence.titre}
      </h1>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
        {new Date(sequence.date).toLocaleDateString('fr-FR')}
        {sequence.lieu && <> · {sequence.lieu}</>}
        {(sequence.address || sequence.postalCode || sequence.city) && (
          <> · {[sequence.address, [sequence.postalCode, sequence.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</>
        )}
        {sequence.visioLink && (
          <>
            {' · '}
            <a href={sequence.visioLink} target="_blank" rel="noreferrer">
              Rejoindre la visio ↗
            </a>
          </>
        )}
        {sequence.formateur && (
          <>
            {' '}
            · {sequence.formateur.firstName} {sequence.formateur.lastName}
          </>
        )}
      </p>

      <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--color-warning)' }}>
        <p className="t-caption-1">
          🔴 Cette version ne gère pas encore le mode hors ligne (service worker + file d&apos;attente locale) — une
          coupure réseau pendant la séquence bloquera la saisie. La preuve papier reste disponible : sélectionnez un
          document scanné existant comme preuve pour un participant en preuve « Papier ».
        </p>
      </div>

      {sequence.parcours.participants.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun participant inscrit à ce parcours.
        </p>
      ) : (
        sequence.demiJournees.map((dj) => {
          const rows = sequence.parcours.participants.map((pp) => ({
            pp,
            attendance: attendanceByKey.get(`${pp.participantId}-${dj}`),
          }))
          const presentCount = rows.filter((r) => r.attendance?.status === 'PRESENT').length
          const absentCount = rows.filter(
            (r) => r.attendance?.status === 'ABSENT_JUSTIFIE' || r.attendance?.status === 'ABSENT_NON_JUSTIFIE',
          ).length
          const incomplete = snapshot.requiresFullCohort && absentCount > 0

          return (
            <div key={dj} id={`dj-${dj}`} style={{ marginBottom: 'var(--space-9)', scrollMarginTop: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <h2 className="t-heading">{DEMI_JOURNEE_LABELS[dj] ?? dj}</h2>
                <span className="badge badge-neutral">
                  {presentCount}/{rows.length} présents
                </span>
              </div>

              {incomplete && (
                <div className="card" style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>
                  <span className="badge badge-danger">Collectif incomplet</span>
                  <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                    {snapshot.title} exige un collectif complet — cette absence nécessite une justification
                    pédagogique, pas une simple note d&apos;absence de routine.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {rows.map(({ pp, attendance }) => (
                  <div key={pp.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                          {pp.participant.firstName} {pp.participant.lastName}
                        </span>{' '}
                        <span
                          className={`badge ${
                            attendance?.status === 'PRESENT'
                              ? 'badge-success'
                              : attendance?.status === 'ABSENT_JUSTIFIE'
                                ? 'badge-warning'
                                : attendance?.status
                                  ? 'badge-danger'
                                  : 'badge-neutral'
                          }`}
                        >
                          {attendance ? (ATTENDANCE_STATUS_LABELS[attendance.status] ?? attendance.status) : 'Non saisi'}
                        </span>
                        {attendance?.formateurSignedAt && <span className="badge badge-accent">Contre-signé</span>}
                      </div>
                      {canWrite && attendance?.status === 'PRESENT' && !attendance.formateurSignedAt && (
                        <form action={counterSignAttendanceAction}>
                          <input type="hidden" name="attendanceId" value={attendance.id} />
                          <input type="hidden" name="sequenceId" value={sequence.id} />
                          <input type="hidden" name="parcoursId" value={id} />
                          <button type="submit" className="btn btn-sm btn-secondary">
                            Contre-signer (formateur)
                          </button>
                        </form>
                      )}
                    </div>

                    {canWrite && (
                      <details style={{ marginTop: 'var(--space-3)' }}>
                        <summary className="t-caption-1" style={{ cursor: 'pointer' }}>
                          {attendance ? 'Modifier la saisie' : 'Saisir la présence'}
                        </summary>
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <AttendanceForm
                            action={markAttendanceAction}
                            parcoursId={id}
                            sequenceId={sequence.id}
                            participantId={pp.participantId}
                            demiJournee={dj as DemiJournee}
                            preuveType={sequence.preuveType}
                            currentStatus={attendance?.status ?? null}
                            currentJustification={attendance?.justification ?? null}
                            documents={sequence.documents.map((d) => ({ id: d.id, label: d.filename }))}
                          />
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </>
  )
}
