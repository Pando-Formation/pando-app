'use client'

import { useActionState } from 'react'
import type { DocumentActionState } from '@/app/(app)/parcours/document-actions'

type Props = {
  action: (state: DocumentActionState, formData: FormData) => Promise<DocumentActionState>
  parcoursId: string
  hiddenFields: Record<string, string>
  label: string
}

export function GenerateDocumentButton({ action, parcoursId, hiddenFields, label }: Props) {
  const [state, formAction, pending] = useActionState<DocumentActionState, FormData>(action, null)

  return (
    <form action={formAction} style={{ display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className="btn btn-sm btn-secondary" disabled={pending}>
        {pending ? 'Génération…' : label}
      </button>
      {state?.error && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)' }}>
          {state.error}
        </p>
      )}
    </form>
  )
}
