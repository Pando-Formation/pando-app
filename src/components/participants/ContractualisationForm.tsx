'use client'

import { useActionState, useState } from 'react'
import { PAYER_TYPE_LABELS, CONTRACTUALISATION_STATUS_LABELS, PRICE_MODE_LABELS } from '@/lib/participant-labels'
import type { ContractualisationActionState } from '@/app/(app)/parcours/actions'

export type ContractualisationDefaultValues = {
  payerType: string
  payerId: string
  status: string
  priceMode: string
  montantHTEuros: string
  remiseEuros: string
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
  status: 'BROUILLON',
  priceMode: 'FORFAIT_JOUR',
  montantHTEuros: '',
  remiseEuros: '0',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Statut</label>
          <select className="input" name="status" defaultValue={v.status}>
            {Object.entries(CONTRACTUALISATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Mode de tarification</label>
          <select className="input" name="priceMode" defaultValue={v.priceMode}>
            {Object.entries(PRICE_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Montant HT (€)</label>
          <input className="input" type="number" step="0.01" min="0" name="montantHT" defaultValue={v.montantHTEuros} required />
          {errors.montantHT && <FieldError messages={errors.montantHT} />}
        </div>
        <div>
          <label className="input-label">Remise (€)</label>
          <input className="input" type="number" step="0.01" min="0" name="remise" defaultValue={v.remiseEuros} />
        </div>
        <div>
          <label className="input-label">Délai de règlement (jours)</label>
          <input className="input" type="number" name="delaiReglement" defaultValue={v.delaiReglement} />
        </div>
      </div>
      <p className="t-caption-1">
        La remise vit sur la contractualisation, pas sur le parcours — un payeur négocie, un autre non, sur la même
        session.
      </p>

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
