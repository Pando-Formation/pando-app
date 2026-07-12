'use client'

import { useActionState, useState } from 'react'
import { ATTENDANCE_STATUS_LABELS } from '@/lib/attendance-labels'
import type { AttendanceActionState } from '@/app/(app)/parcours/attendance-actions'
import type { DemiJournee, PreuveType } from '@prisma/client'

type Option = { id: string; label: string }

type Props = {
  action: (state: AttendanceActionState, formData: FormData) => Promise<AttendanceActionState>
  parcoursId: string
  sequenceId: string
  participantId: string
  demiJournee: DemiJournee
  preuveType: PreuveType
  currentStatus: string | null
  currentJustification: string | null
  documents: Option[]
}

export function AttendanceForm({
  action,
  parcoursId,
  sequenceId,
  participantId,
  demiJournee,
  preuveType,
  currentStatus,
  currentJustification,
  documents,
}: Props) {
  const [state, formAction, pending] = useActionState<AttendanceActionState, FormData>(action, null)
  const [status, setStatus] = useState(currentStatus ?? 'PRESENT')
  const errors = state?.fieldErrors ?? {}
  const isAbsent = status === 'ABSENT_JUSTIFIE' || status === 'ABSENT_NON_JUSTIFIE'

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      <input type="hidden" name="sequenceId" value={sequenceId} />
      <input type="hidden" name="participantId" value={participantId} />
      <input type="hidden" name="demiJournee" value={demiJournee} />

      {state?.formError && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)' }}>
          {state.formError}
        </p>
      )}

      <select className="input" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {isAbsent && (
        <div>
          <textarea className="input" name="justification" defaultValue={currentJustification ?? ''} rows={2} placeholder="Motif de l'absence" />
          {errors.justification && (
            <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
              {errors.justification.join(' ')}
            </p>
          )}
        </div>
      )}

      {status === 'PRESENT' && preuveType === 'SIGNATURE' && (
        <div>
          <input className="input" name="signatureName" placeholder="Nom tapé en guise de signature" />
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            Preuve = signature. La saisie du nom + l&apos;horodatage + l&apos;IP font foi (pas de capture graphique
            dans cette version).
          </p>
        </div>
      )}

      {status === 'PRESENT' && preuveType === 'CONNEXION' && (
        <p className="t-caption-1">Preuve = connexion. L&apos;horodatage de cette saisie fait foi du log de connexion.</p>
      )}

      {status === 'PRESENT' && preuveType === 'COMPLETION' && (
        <p className="t-caption-1">Preuve = complétion e-learning. L&apos;horodatage de cette saisie fait foi de la trace de complétion.</p>
      )}

      {status === 'PRESENT' && preuveType === 'PAPER' && (
        <div>
          <select className="input" name="documentId" defaultValue="">
            <option value="">— Sélectionner la feuille scannée —</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            🔴 Le fallback papier reste disponible même sans réseau — sélectionnez le document scanné correspondant.
          </p>
        </div>
      )}

      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
