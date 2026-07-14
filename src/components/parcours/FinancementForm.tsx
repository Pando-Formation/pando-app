'use client'

import { useActionState } from 'react'
import { FINANCEMENT_TYPE_LABELS } from '@/lib/participant-labels'
import type { FinancementActionState } from '@/app/(app)/parcours/actions'

export type FinancementDefaultValues = {
  type: string
  financeurId: string
  dossierNumber: string
  montantPrisEnChargeEuros: string
}

type Option = { id: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  action: (state: FinancementActionState, formData: FormData) => Promise<FinancementActionState>
  parcoursId: string
  contractualisationId: string
  financementId?: string
  defaultValues?: FinancementDefaultValues
  financeurs: Option[]
}

const EMPTY: FinancementDefaultValues = {
  type: 'ENTREPRISE_DIRECTE',
  financeurId: '',
  dossierNumber: '',
  montantPrisEnChargeEuros: '',
}

export function FinancementForm({ mode, action, parcoursId, contractualisationId, financementId, defaultValues, financeurs }: Props) {
  const [state, formAction, pending] = useActionState<FinancementActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      <input type="hidden" name="contractualisationId" value={contractualisationId} />
      {mode === 'edit' && <input type="hidden" name="id" value={financementId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Type de financement</label>
          <select className="input" name="type" defaultValue={v.type}>
            {Object.entries(FINANCEMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.type && <FieldError messages={errors.type} />}
        </div>
        <div>
          <label className="input-label">Financeur (OPCO…)</label>
          <select className="input" name="financeurId" defaultValue={v.financeurId}>
            <option value="">—</option>
            {financeurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">N° de dossier</label>
          <input className="input" name="dossierNumber" defaultValue={v.dossierNumber} />
        </div>
        <div>
          <label className="input-label">Montant pris en charge (€)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            name="montantPrisEnCharge"
            defaultValue={v.montantPrisEnChargeEuros}
            required
          />
          {errors.montantPrisEnCharge && <FieldError messages={errors.montantPrisEnCharge} />}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Ajouter le financement' : 'Enregistrer'}
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
