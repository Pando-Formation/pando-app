'use client'

import { useActionState, useState } from 'react'
import { PAYER_TYPE_LABELS } from '@/lib/participant-labels'
import type { ContractualisationActionState } from '@/app/(app)/parcours/actions'

export type ContractualisationDefaultValues = {
  payerType: string
  payerId: string
  delaiReglement: string
  numeroEngagement: string
  codeService: string
}

type Option = { id: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  action: (state: ContractualisationActionState, formData: FormData) => Promise<ContractualisationActionState>
  parcoursId: string
  contractualisationId?: string
  defaultValues?: ContractualisationDefaultValues
  clients: Option[]
  participants: Option[]
  financeurs: Option[]
}

const EMPTY: ContractualisationDefaultValues = {
  payerType: 'ORGANISATION',
  payerId: '',
  delaiReglement: '',
  numeroEngagement: '',
  codeService: '',
}

export function ContractualisationForm({
  mode,
  action,
  parcoursId,
  contractualisationId,
  defaultValues,
  clients,
  participants,
  financeurs,
}: Props) {
  const [state, formAction, pending] = useActionState<ContractualisationActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}
  const [payerType, setPayerType] = useState(v.payerType)

  const payerOptions = payerType === 'INDIVIDU' ? participants : payerType === 'OPCO' ? financeurs : clients

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      {mode === 'edit' && <input type="hidden" name="id" value={contractualisationId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Type de payeur</label>
          <input type="hidden" name="payerType" value={payerType} />
          <select className="input" id="payer-type-select" value={payerType} onChange={(e) => setPayerType(e.target.value)}>
            {Object.entries(PAYER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Payeur</label>
          <select className="input" name="payerId" defaultValue={v.payerId} required>
            <option value="">— Choisir —</option>
            {payerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.payerId && <FieldError messages={errors.payerId} />}
        </div>
      </div>

      {payerType === 'INDIVIDU' && (
        <p className="t-caption-1">
          Payeur individuel — un délai de rétractation de 10 jours est calculé et appliqué automatiquement, jamais
          saisi à la main. Aucun paiement ne peut être demandé pendant cette période.
        </p>
      )}

      <div>
        <label className="input-label">Délai de règlement (jours)</label>
        <input className="input" type="number" name="delaiReglement" defaultValue={v.delaiReglement} style={{ maxWidth: 220 }} />
        <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
          Le montant HT n&apos;est plus saisi ici — il est calculé automatiquement à partir du prix des séquences du
          parcours.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">N° d&apos;engagement (secteur public / Chorus Pro)</label>
          <input className="input" name="numeroEngagement" defaultValue={v.numeroEngagement} />
        </div>
        <div>
          <label className="input-label">Code service (Chorus Pro)</label>
          <input className="input" name="codeService" defaultValue={v.codeService} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer la contractualisation' : 'Enregistrer'}
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
