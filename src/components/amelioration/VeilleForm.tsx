'use client'

import { useActionState } from 'react'
import { VEILLE_TYPE_LABELS } from '@/lib/amelioration-labels'
import type { AmeliorationActionState } from '@/app/(app)/amelioration/actions'

type Props = {
  action: (state: AmeliorationActionState, formData: FormData) => Promise<AmeliorationActionState>
}

export function VeilleForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<AmeliorationActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {state?.formError && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)' }}>
          {state.formError}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="input-label">Type</label>
          <select className="input" name="type" defaultValue="METIER">
            {Object.entries(VEILLE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Source</label>
          <input className="input" name="source" placeholder="Légifrance, revue Qualiopi…" required />
        </div>
        <div>
          <label className="input-label">Date</label>
          <input className="input" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
      </div>
      <div>
        <label className="input-label">Résumé</label>
        <textarea className="input" name="summary" rows={2} required />
        {errors.summary && (
          <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
            {errors.summary.join(' ')}
          </p>
        )}
      </div>
      <div>
        <label className="input-label">Ce qui change chez PANDO</label>
        <textarea className="input" name="soWhat" rows={2} required />
        {errors.soWhat && (
          <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
            {errors.soWhat.join(' ')}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer la veille'}
      </button>
    </form>
  )
}
