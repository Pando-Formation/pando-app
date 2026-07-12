'use client'

import { useActionState } from 'react'
import type { EnrollActionState } from '@/app/(app)/parcours/actions'

type Option = { id: string; label: string }

type Props = {
  action: (state: EnrollActionState, formData: FormData) => Promise<EnrollActionState>
  parcoursId: string
  participants: Option[]
  contractualisations: Option[]
}

export function EnrollParticipantForm({ action, parcoursId, participants, contractualisations }: Props) {
  const [state, formAction, pending] = useActionState<EnrollActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div>
        <label className="input-label">Participant</label>
        <select className="input" name="participantId" required>
          <option value="">— Choisir —</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.participantId && <FieldError messages={errors.participantId} />}
        <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
          Le participant doit exister au préalable — créez-le depuis Participants s&apos;il n&apos;apparaît pas ici.
        </p>
      </div>

      <div>
        <label className="input-label">Contractualisation (qui paie pour cette personne)</label>
        <select className="input" name="contractualisationId">
          <option value="">—</option>
          {contractualisations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
          Dans un inter cohort, chaque participant peut dépendre d&apos;un payeur différent.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Inscription…' : 'Inscrire'}
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
