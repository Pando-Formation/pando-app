'use client'

import { useActionState } from 'react'
import { COMPETENCE_TYPE_LABELS } from '@/lib/formateur-labels'
import type { CompetenceActionState } from '@/app/(app)/formateurs/actions'

type Props = {
  formateurId: string
  action: (state: CompetenceActionState, formData: FormData) => Promise<CompetenceActionState>
}

export function CompetenceForm({ formateurId, action }: Props) {
  const [state, formAction, pending] = useActionState<CompetenceActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <input type="hidden" name="formateurId" value={formateurId} />

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div>
        <label className="input-label">Type</label>
        <select className="input" name="type" defaultValue="CERTIFICATION">
          {Object.entries(COMPETENCE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label">Titre</label>
        <input className="input" name="title" required />
        {errors.title && <FieldError messages={errors.title} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="input-label">Date</label>
          <input className="input" type="date" name="date" required />
          {errors.date && <FieldError messages={errors.date} />}
        </div>
        <div>
          <label className="input-label">Expire le (si applicable)</label>
          <input className="input" type="date" name="expiresAt" />
        </div>
      </div>

      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Ajouter'}
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
