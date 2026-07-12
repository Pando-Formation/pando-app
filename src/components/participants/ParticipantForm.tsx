'use client'

import { useActionState } from 'react'
import { CIVILITE_LABELS } from '@/lib/client-labels'
import { SITUATION_LABELS } from '@/lib/participant-labels'
import type { ParticipantActionState } from '@/app/(app)/participants/actions'

export type ParticipantDefaultValues = {
  civilite: string | null
  firstName: string
  lastName: string
  email: string
  address: string
  postalCode: string
  city: string
  fonction: string
  situation: string
  clientId: string | null
}

type Option = { id: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  action: (state: ParticipantActionState, formData: FormData) => Promise<ParticipantActionState>
  participantId?: string
  defaultValues?: ParticipantDefaultValues
  clients: Option[]
}

const EMPTY: ParticipantDefaultValues = {
  civilite: null,
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  postalCode: '',
  city: '',
  fonction: '',
  situation: 'SALARIE',
  clientId: null,
}

export function ParticipantForm({ mode, action, participantId, defaultValues, clients }: Props) {
  const [state, formAction, pending] = useActionState<ParticipantActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
      {mode === 'edit' && <input type="hidden" name="id" value={participantId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Identité
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Civilité</label>
            <select className="input" name="civilite" defaultValue={v.civilite ?? ''}>
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
            <input className="input" name="firstName" defaultValue={v.firstName} required />
            {errors.firstName && <FieldError messages={errors.firstName} />}
          </div>
          <div>
            <label className="input-label">Nom</label>
            <input className="input" name="lastName" defaultValue={v.lastName} required />
            {errors.lastName && <FieldError messages={errors.lastName} />}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">E-mail</label>
            <input className="input" type="email" name="email" defaultValue={v.email} required />
            {errors.email && <FieldError messages={errors.email} />}
          </div>
          <div>
            <label className="input-label">Fonction</label>
            <input className="input" name="fonction" defaultValue={v.fonction} />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Adresse</label>
          <input className="input" name="address" defaultValue={v.address} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Code postal</label>
            <input className="input" name="postalCode" defaultValue={v.postalCode} />
          </div>
          <div>
            <label className="input-label">Ville</label>
            <input className="input" name="city" defaultValue={v.city} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Situation — sélectionne le document légal
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Situation</label>
            <select className="input" name="situation" defaultValue={v.situation}>
              {Object.entries(SITUATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Employeur (si salarié)</label>
            <select className="input" name="clientId" defaultValue={v.clientId ?? ''}>
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Un particulier auto-financé reçoit un contrat de formation professionnelle avec un délai de rétractation
          de 10 jours — pas une convention de formation.
        </p>
      </div>

      <button type="submit" className="btn btn-lg btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le participant' : 'Enregistrer'}
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
