'use client'

import { useActionState } from 'react'
import { ACTION_ORIGIN_LABELS } from '@/lib/amelioration-labels'
import type { AmeliorationActionState } from '@/app/(app)/amelioration/actions'

type Option = { id: string; label: string }

type Props = {
  action: (state: AmeliorationActionState, formData: FormData) => Promise<AmeliorationActionState>
  owners: Option[]
}

export function ActionForm({ action, owners }: Props) {
  const [state, formAction, pending] = useActionState<AmeliorationActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {state?.formError && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)' }}>
          {state.formError}
        </p>
      )}
      <div>
        <label className="input-label">Description</label>
        <textarea className="input" name="description" rows={2} required />
        {errors.description && (
          <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
            {errors.description.join(' ')}
          </p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="input-label">Origine</label>
          <select className="input" name="origin" defaultValue="INTERNE">
            {Object.entries(ACTION_ORIGIN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Responsable</label>
          <select className="input" name="ownerId" required>
            <option value="">— Choisir —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.ownerId && (
            <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
              {errors.ownerId.join(' ')}
            </p>
          )}
        </div>
        <div>
          <label className="input-label">Échéance</label>
          <input className="input" type="date" name="dueDate" required />
        </div>
      </div>
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : "Créer l'action"}
      </button>
    </form>
  )
}
