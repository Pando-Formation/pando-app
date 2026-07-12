'use client'

import { useActionState, useState } from 'react'
import { PANDO_ROLE_LABELS, TRACK_LABELS, PARCOURS_STATUS_LABELS } from '@/lib/parcours-labels'
import type { ParcoursActionState } from '@/app/(app)/parcours/actions'

export type ParcoursDefaultValues = {
  reference: string
  formationId: string
  formationTitle: string
  pandoRole: string
  track: string
  status: string
  clientId: string | null
  beneficiaireId: string | null
  donneurOrdreId: string | null
  minParticipants: string
  maxParticipants: string
  delaiReglement: string
  cancellationReason: string
}

type Option = { id: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  action: (state: ParcoursActionState, formData: FormData) => Promise<ParcoursActionState>
  parcoursId?: string
  defaultValues?: ParcoursDefaultValues
  formations: Option[]
  clients: Option[]
}

const EMPTY: ParcoursDefaultValues = {
  reference: '',
  formationId: '',
  formationTitle: '',
  pandoRole: 'PRESTATAIRE_DIRECT',
  track: 'INTRA',
  status: 'BROUILLON',
  clientId: null,
  beneficiaireId: null,
  donneurOrdreId: null,
  minParticipants: '',
  maxParticipants: '',
  delaiReglement: '30',
  cancellationReason: '',
}

export function ParcoursForm({ mode, action, parcoursId, defaultValues, formations, clients }: Props) {
  const [state, formAction, pending] = useActionState<ParcoursActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  const [track, setTrack] = useState(v.track)
  const [pandoRole, setPandoRole] = useState(v.pandoRole)
  const [status, setStatus] = useState(v.status)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
      {mode === 'edit' && <input type="hidden" name="id" value={parcoursId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Identité
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Référence</label>
            <input className="input" name="reference" defaultValue={v.reference} placeholder="2026-F118" required />
            {errors.reference && <FieldError messages={errors.reference} />}
          </div>
          <div>
            <label className="input-label">Formation</label>
            {mode === 'create' ? (
              <select className="input" name="formationId" defaultValue={v.formationId} required>
                <option value="">— Choisir —</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input" value={v.formationTitle} disabled />
            )}
            {errors.formationId && <FieldError messages={errors.formationId} />}
            {mode === 'edit' && (
              <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                La formation source est figée à la création — éditer le programme ne modifie pas ce parcours.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Cadre juridique et statut
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Track</label>
            <input type="hidden" name="track" value={track} />
            <select className="input" id="track-select" value={track} onChange={(e) => setTrack(e.target.value)}>
              {Object.entries(TRACK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Rôle PANDO</label>
            <input type="hidden" name="pandoRole" value={pandoRole} />
            <select className="input" value={pandoRole} onChange={(e) => setPandoRole(e.target.value)}>
              {Object.entries(PANDO_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Statut</label>
            <input type="hidden" name="status" value={status} />
            <select className="input" id="status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(PARCOURS_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status === 'ANNULE' && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="input-label">Motif d&apos;annulation</label>
            <textarea className="input" name="cancellationReason" defaultValue={v.cancellationReason} rows={2} />
            {errors.cancellationReason && <FieldError messages={errors.cancellationReason} />}
            <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
              Requis — une annulation sans motif est refusée par la base.
            </p>
          </div>
        )}

        {track === 'INTRA' && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="input-label">Client</label>
            <select className="input" name="clientId" defaultValue={v.clientId ?? ''}>
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {track === 'INTER' && (
          <p className="t-caption-1" style={{ marginTop: 'var(--space-5)' }}>
            Un parcours inter n&apos;a pas de client — les participants s&apos;inscrivent individuellement, et les
            payeurs vivent sur la contractualisation.
          </p>
        )}

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Bénéficiaire (si différent du client)</label>
          <select className="input" name="beneficiaireId" defaultValue={v.beneficiaireId ?? ''}>
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {pandoRole === 'SOUS_TRAITANT' && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="input-label">Donneur d&apos;ordre</label>
            <select className="input" name="donneurOrdreId" defaultValue={v.donneurOrdreId ?? ''} required>
              <option value="">— Choisir —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.donneurOrdreId && <FieldError messages={errors.donneurOrdreId} />}
            <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
              Si PANDO est sous-traitant, quelqu&apos;un d&apos;autre est le prime — nommez-le.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Effectif et paiement
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Min. participants</label>
            <input className="input" type="number" name="minParticipants" defaultValue={v.minParticipants} />
            {errors.minParticipants && <FieldError messages={errors.minParticipants} />}
          </div>
          <div>
            <label className="input-label">Max. participants</label>
            <input className="input" type="number" name="maxParticipants" defaultValue={v.maxParticipants} />
          </div>
          <div>
            <label className="input-label">Délai de règlement (jours)</label>
            <input className="input" type="number" name="delaiReglement" defaultValue={v.delaiReglement} />
          </div>
        </div>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Si le programme exige un collectif complet, min. et max. doivent être identiques.
        </p>
      </div>

      <p className="t-caption-1">
        Dates de début/fin et durée totale ne se saisissent pas ici — elles sont calculées depuis les séquences.
      </p>

      <button type="submit" className="btn btn-lg btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le parcours' : 'Enregistrer'}
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
