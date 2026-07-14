'use client'

import { useActionState } from 'react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { DocumentActionState } from '@/app/(app)/parcours/document-actions'

export function GenerateDocumentMenuItem({
  action,
  parcoursId,
  hiddenFields,
  label,
  icon: Icon,
}: {
  action: (state: DocumentActionState, formData: FormData) => Promise<DocumentActionState>
  parcoursId: string
  hiddenFields: Record<string, string>
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
}) {
  const [state, formAction, pending] = useActionState<DocumentActionState, FormData>(action, null)
  return (
    <form action={formAction}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <DropdownMenuItem closeOnClick={false} render={<button type="submit" className="w-full" disabled={pending} />}>
        <Icon style={{ width: 14, height: 14 }} />
        {pending ? 'Génération…' : label}
      </DropdownMenuItem>
      {state?.error && (
        <p className="t-caption-1" style={{ color: 'var(--color-danger)', padding: '0 var(--space-2)' }}>
          {state.error}
        </p>
      )}
    </form>
  )
}
