'use client'

import { useActionState, useState } from 'react'
import { ObjectivesEditor } from '@/components/catalogue/ObjectivesEditor'
import { CIVILITE_LABELS } from '@/lib/client-labels'
import { CONTRACT_TYPE_LABELS } from '@/lib/formateur-labels'
import { formateurDayCost, euros } from '@/lib/money'
import type { FormateurActionState } from '@/app/(app)/formateurs/actions'

export type FormateurDefaultValues = {
  civilite: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  contractType: string
  siren: string
  nda: string
  tvaRate: string
  tarifJourEuros: string
  forfaitDeplacementEuros: string
  isQualiopiCertified: boolean
  expertises: string[]
  yearsFormation: string
  yearsManagement: string
  availabilityNotes: string
}

type Props = {
  mode: 'create' | 'edit'
  action: (state: FormateurActionState, formData: FormData) => Promise<FormateurActionState>
  formateurId?: string
  defaultValues?: FormateurDefaultValues
}

const EMPTY: FormateurDefaultValues = {
  civilite: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  contractType: 'EXTERNE_PRESTATAIRE',
  siren: '',
  nda: '',
  tvaRate: '0',
  tarifJourEuros: '',
  forfaitDeplacementEuros: '0',
  isQualiopiCertified: false,
  expertises: [],
  yearsFormation: '',
  yearsManagement: '',
  availabilityNotes: '',
}

export function FormateurForm({ mode, action, formateurId, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<FormateurActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  const [contractType, setContractType] = useState(v.contractType)
  const [tvaRate, setTvaRate] = useState(v.tvaRate)
  const [tarifJourEuros, setTarifJourEuros] = useState(v.tarifJourEuros)
  const [forfaitDeplacementEuros, setForfaitDeplacementEuros] = useState(v.forfaitDeplacementEuros)

  const isInternal = contractType !== 'EXTERNE_PRESTATAIRE'

  const dayCostCents = formateurDayCost({
    contractType: contractType as 'INTERNE_DIRIGEANT' | 'INTERNE_SALARIE' | 'EXTERNE_PRESTATAIRE',
    tarifJour: tarifJourEuros ? Math.round(Number(tarifJourEuros) * 100) : null,
    tvaRate: Number(tvaRate) || 0,
    forfaitDeplacement: forfaitDeplacementEuros ? Math.round(Number(forfaitDeplacementEuros) * 100) : 0,
  })

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
      {mode === 'edit' && <input type="hidden" name="id" value={formateurId} />}

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
            <label className="input-label">E-mail — identité de connexion (lien magique)</label>
            <input className="input" type="email" name="email" defaultValue={v.email} required />
            {errors.email && <FieldError messages={errors.email} />}
          </div>
          <div>
            <label className="input-label">Téléphone</label>
            <input className="input" name="phone" defaultValue={v.phone} />
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
            {errors.postalCode && <FieldError messages={errors.postalCode} />}
          </div>
          <div>
            <label className="input-label">Ville</label>
            <input className="input" name="city" defaultValue={v.city} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Contrat et coût réel
        </h2>
        <div>
          <label className="input-label">Type de contrat</label>
          <select
            className="input"
            name="contractType"
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          >
            {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">SIREN {isInternal && '(réservé aux externes)'}</label>
            <input className="input" name="siren" defaultValue={v.siren} disabled={isInternal} />
            {errors.siren && <FieldError messages={errors.siren} />}
          </div>
          <div>
            <label className="input-label">NDA {isInternal && '(réservé aux externes)'}</label>
            <input className="input" name="nda" defaultValue={v.nda} disabled={isInternal} />
          </div>
        </div>
        {isInternal && (
          <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
            Un formateur interne ne peut porter ni SIREN ni NDA — c&apos;est ce qui rend une convention de
            sous-traitance fantôme impossible.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Taux TVA (0 à 1)</label>
            <input
              className="input"
              name="tvaRate"
              value={tvaRate}
              onChange={(e) => setTvaRate(e.target.value)}
              placeholder="0.20"
            />
            {errors.tvaRate && <FieldError messages={errors.tvaRate} />}
          </div>
          <div>
            <label className="input-label">Tarif jour (€ HT)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              name="tarifJour"
              value={tarifJourEuros}
              onChange={(e) => setTarifJourEuros(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Forfait déplacement (€)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              name="forfaitDeplacement"
              value={forfaitDeplacementEuros}
              onChange={(e) => setForfaitDeplacementEuros(e.target.value)}
            />
          </div>
        </div>

        <div className="badge badge-accent" style={{ marginTop: 'var(--space-5)', width: 'fit-content' }}>
          Coût réel par jour : {euros(dayCostCents)}
        </div>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Interne = 0 € (transfert notionnel, pas de sortie de trésorerie). Externe = tarif jour × (1 + TVA) +
          déplacement — la TVA est une charge absorbée, pas un flux transparent.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <input type="checkbox" name="isQualiopiCertified" defaultChecked={v.isQualiopiCertified} />
          <span className="t-body-sm">Certifié Qualiopi (formateur externe)</span>
        </label>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Expertise
        </h2>
        <label className="input-label">Domaines d&apos;expertise</label>
        <ObjectivesEditor name="expertises" defaultValue={v.expertises} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Années formation</label>
            <input className="input" type="number" name="yearsFormation" defaultValue={v.yearsFormation} />
          </div>
          <div>
            <label className="input-label">Années management</label>
            <input className="input" type="number" name="yearsManagement" defaultValue={v.yearsManagement} />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Disponibilités — notes</label>
          <textarea className="input" name="availabilityNotes" defaultValue={v.availabilityNotes} rows={2} />
        </div>
      </div>

      <button type="submit" className="btn btn-lg btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le formateur' : 'Enregistrer'}
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
