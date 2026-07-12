'use client'

import { useActionState } from 'react'
import { RECLAMATION_SOURCE_LABELS } from '@/lib/amelioration-labels'
import type { AmeliorationActionState } from '@/app/(app)/amelioration/actions'

type Props = {
  action: (state: AmeliorationActionState, formData: FormData) => Promise<AmeliorationActionState>
}

export function ReclamationForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<AmeliorationActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {state?.formError && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)' }}>
          {state.formError}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="input-label">Source</label>
          <select className="input" name="source" defaultValue="CLIENT">
            {Object.entries(RECLAMATION_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Reçue le</label>
          <input className="input" type="date" name="receivedAt" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
      </div>
      <div>
        <label className="input-label">Description</label>
        <textarea className="input" name="description" rows={2} required />
        {errors.description && (
          <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
            {errors.description.join(' ')}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer la réclamation'}
      </button>
    </form>
  )
}
