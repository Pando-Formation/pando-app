'use client'

import { useActionState } from 'react'
import type { FormationSessionActionState } from '@/app/(app)/parcours/actions'

export type FormationSessionDefaultValues = {
  titre: string
}

type Props = {
  mode: 'create' | 'edit'
  action: (state: FormationSessionActionState, formData: FormData) => Promise<FormationSessionActionState>
  parcoursId: string
  sessionId?: string
  defaultValues?: FormationSessionDefaultValues
}

const EMPTY: FormationSessionDefaultValues = {
  titre: '',
}

export function FormationSessionForm({ mode, action, parcoursId, sessionId, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<FormationSessionActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      {mode === 'edit' && <input type="hidden" name="id" value={sessionId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div>
        <label className="input-label">Titre de session</label>
        <input className="input" name="titre" defaultValue={v.titre} required />
        {errors.titre && <FieldError messages={errors.titre} />}
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer la session' : 'Enregistrer'}
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
