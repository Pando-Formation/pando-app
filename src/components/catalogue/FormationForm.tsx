'use client'

import { useActionState } from 'react'
import { NsfPicker } from '@/components/catalogue/NsfPicker'
import { ObjectivesEditor } from '@/components/catalogue/ObjectivesEditor'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS, PRESTATION_CODE_LABELS } from '@/lib/catalogue-labels'
import type { NsfTree } from '@/lib/nsf'
import type { FormationActionState } from '@/app/(app)/catalogue/formations/actions'

export type FormationDefaultValues = {
  internalCode: string
  title: string
  subtitle: string | null
  brandProgramme: string | null
  requiresFullCohort: boolean
  intraOnly: boolean
  durationHours: string
  durationDays: string
  format: string
  prerequisites: string
  targetAudience: string
  pedagogicObjectives: string[]
  methodesPedagogiques: string | null
  modalitesEvaluation: string | null
  delaiAcces: string
  accessibilite: string
  priceIntraPerDayEuros: string
  priceInterPerPersonEuros: string
  bpfIncluded: boolean
  prestationCode: string | null
  specialiteId: string | null
}

type Props = {
  nsfTree: NsfTree
  mode: 'create' | 'edit'
  action: (state: FormationActionState, formData: FormData) => Promise<FormationActionState>
  formationId?: string
  defaultValues?: FormationDefaultValues
}

const EMPTY: FormationDefaultValues = {
  internalCode: '',
  title: '',
  subtitle: null,
  brandProgramme: null,
  requiresFullCohort: false,
  intraOnly: false,
  durationHours: '',
  durationDays: '',
  format: 'PRESENTIEL',
  prerequisites: '',
  targetAudience: '',
  pedagogicObjectives: [],
  methodesPedagogiques: null,
  modalitesEvaluation: null,
  delaiAcces: '',
  accessibilite: '',
  priceIntraPerDayEuros: '',
  priceInterPerPersonEuros: '',
  bpfIncluded: true,
  prestationCode: null,
  specialiteId: null,
}

export function FormationForm({ nsfTree, mode, action, formationId, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<FormationActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
      {mode === 'edit' && <input type="hidden" name="id" value={formationId} />}

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Identité
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Code interne</label>
            <input className="input" name="internalCode" defaultValue={v.internalCode} required />
            {errors.internalCode && <FieldError messages={errors.internalCode} />}
          </div>
          <div>
            <label className="input-label">Programme de marque</label>
            <select className="input" name="brandProgramme" defaultValue={v.brandProgramme ?? ''}>
              <option value="">— Aucun —</option>
              {Object.entries(BRAND_PROGRAMME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Titre</label>
          <input className="input" name="title" defaultValue={v.title} required />
          {errors.title && <FieldError messages={errors.title} />}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Sous-titre</label>
          <input className="input" name="subtitle" defaultValue={v.subtitle ?? ''} />
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Durée et format
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Durée (heures)</label>
            <input className="input" name="durationHours" defaultValue={v.durationHours} required />
            {errors.durationHours && <FieldError messages={errors.durationHours} />}
          </div>
          <div>
            <label className="input-label">Durée (jours)</label>
            <input className="input" name="durationDays" defaultValue={v.durationDays} required />
            {errors.durationDays && <FieldError messages={errors.durationDays} />}
          </div>
          <div>
            <label className="input-label">Format</label>
            <select className="input" name="format" defaultValue={v.format} required>
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-7)', marginTop: 'var(--space-5)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <input type="checkbox" name="requiresFullCohort" defaultChecked={v.requiresFullCohort} />
            <span className="t-body-sm">Collectif complet requis</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <input type="checkbox" name="intraOnly" defaultChecked={v.intraOnly} />
            <span className="t-body-sm">Intra uniquement</span>
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Pédagogie
        </h2>

        <div>
          <label className="input-label">Public visé</label>
          <textarea className="input" name="targetAudience" defaultValue={v.targetAudience} rows={2} required />
          {errors.targetAudience && <FieldError messages={errors.targetAudience} />}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Prérequis</label>
          <textarea className="input" name="prerequisites" defaultValue={v.prerequisites} rows={2} required />
          {errors.prerequisites && <FieldError messages={errors.prerequisites} />}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Objectifs pédagogiques</label>
          <ObjectivesEditor name="pedagogicObjectives" defaultValue={v.pedagogicObjectives} />
          {errors.pedagogicObjectives && <FieldError messages={errors.pedagogicObjectives} />}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Méthodes pédagogiques</label>
          <textarea className="input" name="methodesPedagogiques" defaultValue={v.methodesPedagogiques ?? ''} rows={2} />
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Modalités d&apos;évaluation</label>
          <textarea className="input" name="modalitesEvaluation" defaultValue={v.modalitesEvaluation ?? ''} rows={2} />
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Information du public (Criteria 1 &amp; 3)
        </h2>

        <div>
          <label className="input-label">Délai d&apos;accès</label>
          <textarea className="input" name="delaiAcces" defaultValue={v.delaiAcces} rows={2} required />
          {errors.delaiAcces && <FieldError messages={errors.delaiAcces} />}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Accessibilité</label>
          <textarea className="input" name="accessibilite" defaultValue={v.accessibilite} rows={2} required />
          {errors.accessibilite && <FieldError messages={errors.accessibilite} />}
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Spécialité NSF
        </h2>
        <NsfPicker tree={nsfTree} name="specialiteId" defaultSpecialiteId={v.specialiteId} />
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Tarifs et BPF
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Prix intra / jour (€)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              name="priceIntraPerDay"
              defaultValue={v.priceIntraPerDayEuros}
            />
          </div>
          <div>
            <label className="input-label">Prix inter / personne (€)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              name="priceInterPerPerson"
              defaultValue={v.priceInterPerPersonEuros}
            />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Code prestation (BPF)</label>
          <select className="input" name="prestationCode" defaultValue={v.prestationCode ?? ''}>
            <option value="">— Aucun —</option>
            {Object.entries(PRESTATION_CODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <input type="checkbox" name="bpfIncluded" defaultChecked={v.bpfIncluded} />
          <span className="t-body-sm">Inclus dans le BPF</span>
        </label>
      </div>

      <button type="submit" className="btn btn-lg btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer la formation' : 'Enregistrer (nouvelle version)'}
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
