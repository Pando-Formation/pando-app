'use client'

import { useActionState, useState } from 'react'
import { euros } from '@/lib/money'
import type { FactureActionState } from '@/app/(app)/parcours/facturation-actions'

export type InvoiceableSequence = { id: string; titre: string; date: string; heures: string; montantHT: number | null }

type Props = {
  action: (state: FactureActionState, formData: FormData) => Promise<FactureActionState>
  parcoursId: string
  contractualisationId: string
  invoiceableSequences: InvoiceableSequence[]
}

export function FactureForm({ action, parcoursId, contractualisationId, invoiceableSequences }: Props) {
  const [state, formAction, pending] = useActionState<FactureActionState, FormData>(action, null)
  const errors = state?.fieldErrors ?? {}
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [montantOverride, setMontantOverride] = useState<string | null>(null)

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const suggestedCents = invoiceableSequences
    .filter((s) => checkedIds.has(s.id))
    .reduce((sum, s) => sum + (s.montantHT ?? 0), 0)
  const montantDisplayValue = montantOverride ?? (suggestedCents > 0 ? (suggestedCents / 100).toString() : '')

  if (invoiceableSequences.length === 0) {
    return (
      <p className="t-body-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Toutes les séquences réalisées sont déjà facturées, ou aucune séquence n&apos;est encore réalisée.
      </p>
    )
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <input type="hidden" name="parcoursId" value={parcoursId} />
      <input type="hidden" name="contractualisationId" value={contractualisationId} />

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div>
        <label className="input-label">Séquences à facturer</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {invoiceableSequences.map((s) => (
            <label key={s.id} className="t-body-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input
                type="checkbox"
                name="sequenceIds"
                value={s.id}
                checked={checkedIds.has(s.id)}
                onChange={() => toggleChecked(s.id)}
              />
              {s.titre} — {new Date(s.date).toLocaleDateString('fr-FR')} · {s.heures}h ·{' '}
              {s.montantHT !== null ? euros(s.montantHT) : 'non tarifée'}
            </label>
          ))}
        </div>
        {errors.sequenceIds && <FieldError messages={errors.sequenceIds} />}
      </div>

      <div>
        <label className="input-label">Montant HT (€)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          name="montantHT"
          value={montantDisplayValue}
          onChange={(e) => setMontantOverride(e.target.value)}
          required
        />
        {suggestedCents > 0 && montantOverride === null && (
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            Suggéré à partir des séquences sélectionnées — modifiable librement.
          </p>
        )}
        {errors.montantHT && <FieldError messages={errors.montantHT} />}
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Création…' : 'Créer la facture'}
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
