'use client'

import { useActionState } from 'react'
import { CONTACT_ROLE_LABELS, CIVILITE_LABELS } from '@/lib/client-labels'
import type { ContactActionState } from '@/app/(app)/clients/actions'

export type ContactDefaultValues = {
  roles: string[]
  civilite: string | null
  firstName: string
  lastName: string
  fonction: string | null
  email: string
  phone: string | null
}

type Props = {
  clientId: string
  action: (state: ContactActionState, formData: FormData) => Promise<ContactActionState>
  contactId?: string
  defaultValues?: ContactDefaultValues
  onCancel?: () => void
}

export function ContactForm({ clientId, action, contactId, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<ContactActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <input type="hidden" name="clientId" value={clientId} />
      {contactId && <input type="hidden" name="id" value={contactId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div>
        <label className="input-label">Rôles</label>
        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                name="roles"
                value={value}
                defaultChecked={defaultValues?.roles.includes(value)}
              />
              <span className="t-body-sm">{label}</span>
            </label>
          ))}
        </div>
        {errors.roles && <FieldError messages={errors.roles} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="input-label">Civilité</label>
          <select className="input" name="civilite" defaultValue={defaultValues?.civilite ?? ''}>
            <option value="">—</option>
            {Object.entries(CIVILITE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Prénom</label>
          <input className="input" name="firstName" defaultValue={defaultValues?.firstName} required />
          {errors.firstName && <FieldError messages={errors.firstName} />}
        </div>
        <div>
          <label className="input-label">Nom</label>
          <input className="input" name="lastName" defaultValue={defaultValues?.lastName} required />
          {errors.lastName && <FieldError messages={errors.lastName} />}
        </div>
      </div>

      <div>
        <label className="input-label">Fonction</label>
        <input className="input" name="fonction" defaultValue={defaultValues?.fonction ?? ''} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="input-label">E-mail</label>
          <input className="input" type="email" name="email" defaultValue={defaultValues?.email} required />
          {errors.email && <FieldError messages={errors.email} />}
        </div>
        <div>
          <label className="input-label">Téléphone</label>
          <input className="input" name="phone" defaultValue={defaultValues?.phone ?? ''} />
        </div>
      </div>

      <button type="submit" className="btn btn-sm btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : contactId ? 'Enregistrer le contact' : 'Ajouter le contact'}
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
