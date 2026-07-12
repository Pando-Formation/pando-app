'use client'

import { useActionState, useState } from 'react'
import { PARTICIPANT_STATUS_LABELS } from '@/lib/participant-labels'
import type { ParcoursParticipantActionState } from '@/app/(app)/parcours/actions'

export type ParcoursParticipantDefaultValues = {
  status: string
  abandonReason: string
  besoinAccessibilite: string
  adaptationProposee: string
  adaptationTraceeAt: string | null
  referentHandicapId: string | null
}

type Option = { id: string; label: string }

type Props = {
  action: (state: ParcoursParticipantActionState, formData: FormData) => Promise<ParcoursParticipantActionState>
  parcoursId: string
  parcoursParticipantId: string
  participantName: string
  defaultValues: ParcoursParticipantDefaultValues
  referents: Option[]
}

export function ParcoursParticipantForm({
  action,
  parcoursId,
  parcoursParticipantId,
  participantName,
  defaultValues: v,
  referents,
}: Props) {
  const [state, formAction, pending] = useActionState<ParcoursParticipantActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}
  const [status, setStatus] = useState(v.status)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="id" value={parcoursParticipantId} />
      <input type="hidden" name="parcoursId" value={parcoursId} />

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          {participantName}
        </h2>
        <label className="input-label">Statut</label>
        <input type="hidden" name="status" value={status} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(PARTICIPANT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {status === 'ABANDON' && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="input-label">Motif d&apos;abandon</label>
            <textarea className="input" name="abandonReason" defaultValue={v.abandonReason} rows={2} />
            {errors.abandonReason && <FieldError messages={errors.abandonReason} />}
            <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
              Requis — un abandon sans motif se lit comme de la négligence, avec un motif comme un événement géré.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-3)' }}>
          Accessibilité — une chaîne, pas une case à cocher
        </h2>
        <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
          Besoin déclaré → référent handicap → adaptation proposée → réponse tracée. Un besoin déclaré sans réponse
          tracée est une non-conformité.
        </p>

        <label className="input-label">Besoin déclaré</label>
        <textarea className="input" name="besoinAccessibilite" defaultValue={v.besoinAccessibilite} rows={2} />

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Référent handicap</label>
          <select className="input" name="referentHandicapId" defaultValue={v.referentHandicapId ?? ''}>
            <option value="">—</option>
            {referents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Adaptation proposée</label>
          <textarea className="input" name="adaptationProposee" defaultValue={v.adaptationProposee} rows={2} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <input type="checkbox" name="traceResponse" defaultChecked={Boolean(v.adaptationTraceeAt)} />
          <span className="t-body-sm">
            {v.adaptationTraceeAt
              ? `Réponse tracée le ${new Date(v.adaptationTraceeAt).toLocaleDateString('fr-FR')}`
              : 'Marquer la réponse comme tracée (horodatage définitif — la preuve que le besoin a été traité)'}
          </span>
        </label>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

function FieldError({ messages }: { messages: string[] }) {
  return (
    <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
      {messages.join(' ')}
    </p>
  )
}
