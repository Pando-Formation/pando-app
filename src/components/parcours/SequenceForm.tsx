'use client'

import { useActionState } from 'react'
import { SEQUENCE_TYPE_LABELS, PREUVE_TYPE_LABELS, DEMI_JOURNEE_LABELS } from '@/lib/parcours-labels'
import type { SequenceActionState } from '@/app/(app)/parcours/actions'

export type SequenceDefaultValues = {
  ordre: string
  titre: string
  type: string
  date: string
  demiJournees: string[]
  heures: string
  lieu: string
  preuveType: string
  formateurId: string | null
}

type Option = { id: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  action: (state: SequenceActionState, formData: FormData) => Promise<SequenceActionState>
  parcoursId: string
  sequenceId?: string
  defaultValues?: SequenceDefaultValues
  formateurs: Option[]
  nextOrdre: number
}

export function SequenceForm({ mode, action, parcoursId, sequenceId, defaultValues, formateurs, nextOrdre }: Props) {
  const [state, formAction, pending] = useActionState<SequenceActionState, FormData>(action, null)
  const v = defaultValues ?? {
    ordre: String(nextOrdre),
    titre: '',
    type: 'PRESENTIEL',
    date: '',
    demiJournees: [],
    heures: '',
    lieu: '',
    preuveType: 'SIGNATURE',
    formateurId: null,
  }
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      {mode === 'edit' && <input type="hidden" name="id" value={sequenceId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Ordre</label>
          <input className="input" type="number" name="ordre" defaultValue={v.ordre} required />
          {errors.ordre && <FieldError messages={errors.ordre} />}
        </div>
        <div>
          <label className="input-label">Titre</label>
          <input className="input" name="titre" defaultValue={v.titre} required />
          {errors.titre && <FieldError messages={errors.titre} />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Type</label>
          <select className="input" name="type" defaultValue={v.type}>
            {Object.entries(SEQUENCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Date</label>
          <input className="input" type="date" name="date" defaultValue={v.date} required />
          {errors.date && <FieldError messages={errors.date} />}
        </div>
        <div>
          <label className="input-label">Heures</label>
          <input className="input" name="heures" defaultValue={v.heures} placeholder="7" required />
          {errors.heures && <FieldError messages={errors.heures} />}
        </div>
      </div>

      <div>
        <label className="input-label">Demi-journées — l&apos;unité légale</label>
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          {Object.entries(DEMI_JOURNEE_LABELS).map(([value, label]) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                name="demiJournees"
                value={value}
                defaultChecked={v.demiJournees.includes(value)}
              />
              <span className="t-body-sm">{label}</span>
            </label>
          ))}
        </div>
        {errors.demiJournees && <FieldError messages={errors.demiJournees} />}
        <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
          Un jour présentiel complet = matin + après-midi. CLIC! n&apos;utilise qu&apos;une demi-journée par séquence.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
        <div>
          <label className="input-label">Type de preuve</label>
          <select className="input" name="preuveType" defaultValue={v.preuveType}>
            {Object.entries(PREUVE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Lieu</label>
          <input className="input" name="lieu" defaultValue={v.lieu} />
        </div>
        <div>
          <label className="input-label">Formateur</label>
          <select className="input" name="formateurId" defaultValue={v.formateurId ?? ''}>
            <option value="">—</option>
            {formateurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Ajouter la séquence' : 'Enregistrer'}
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
