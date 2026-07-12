'use client'

import { useActionState } from 'react'
import type { FinanceurActionState } from '@/app/(app)/financeurs/actions'

type Props = {
  action: (state: FinanceurActionState, formData: FormData) => Promise<FinanceurActionState>
}

export function FinanceurForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<FinanceurActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}
      <div>
        <label className="input-label">Nom</label>
        <input className="input" name="name" placeholder="AKTO, ATLAS, OPCO 2i…" required />
        {errors.name && <FieldError messages={errors.name} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="input-label">SIRET</label>
          <input className="input" name="siret" />
        </div>
        <div>
          <label className="input-label">Type</label>
          <input className="input" name="type" placeholder="OPCO" />
        </div>
      </div>
      <div>
        <label className="input-label">E-mail de contact</label>
        <input className="input" type="email" name="contactEmail" />
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
