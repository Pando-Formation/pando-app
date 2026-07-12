'use client'

import { useActionState, useState, useTransition } from 'react'
import { CLIENT_STATUS_LABELS, CLIENT_ORIGIN_LABELS } from '@/lib/client-labels'
import { sireneLookupAction } from '@/app/(app)/clients/actions'
import type { ClientActionState } from '@/app/(app)/clients/actions'
import { deriveIsPublicSectorClient } from '@/lib/client-shared'

export type ClientDefaultValues = {
  companyName: string
  siret: string
  siren: string
  isPublicSector: boolean
  categorieJuridique: string
  nafRev2: string
  naf2025: string
  nafSource: 'MANUAL' | 'SIRENE'
  address: string
  postalCode: string
  city: string
  region: string
  status: string
  origin: string
  assignedToId: string
  comments: string
}

type Props = {
  mode: 'create' | 'edit'
  action: (state: ClientActionState, formData: FormData) => Promise<ClientActionState>
  clientId?: string
  defaultValues?: ClientDefaultValues
  assignableUsers: { id: string; name: string | null; email: string }[]
}

const EMPTY: ClientDefaultValues = {
  companyName: '',
  siret: '',
  siren: '',
  isPublicSector: false,
  categorieJuridique: '',
  nafRev2: '',
  naf2025: '',
  nafSource: 'MANUAL',
  address: '',
  postalCode: '',
  city: '',
  region: '',
  status: 'PROSPECT',
  origin: 'DIRECT',
  assignedToId: '',
  comments: '',
}

export function ClientForm({ mode, action, clientId, defaultValues, assignableUsers }: Props) {
  const [state, formAction, pending] = useActionState<ClientActionState, FormData>(action, null)
  const v = defaultValues ?? EMPTY
  const errors = state?.fieldErrors ?? {}

  const [siret, setSiret] = useState(v.siret)
  const [companyName, setCompanyName] = useState(v.companyName)
  const [address, setAddress] = useState(v.address)
  const [postalCode, setPostalCode] = useState(v.postalCode)
  const [city, setCity] = useState(v.city)
  const [categorieJuridique, setCategorieJuridique] = useState(v.categorieJuridique)
  const [nafRev2, setNafRev2] = useState(v.nafRev2)
  const [naf2025, setNaf2025] = useState(v.naf2025)
  const [nafSource, setNafSource] = useState(v.nafSource)
  const [isPublicSectorOverride, setIsPublicSectorOverride] = useState(v.isPublicSector)

  const [lookupPending, startLookup] = useTransition()
  const [lookupError, setLookupError] = useState<string | null>(null)

  const isPublicSector = isPublicSectorOverride || deriveIsPublicSectorClient(categorieJuridique)

  function runLookup() {
    setLookupError(null)
    if (!/^[0-9]{14}$/.test(siret)) {
      setLookupError('Le SIRET doit contenir exactement 14 chiffres avant la recherche.')
      return
    }
    startLookup(async () => {
      const result = await sireneLookupAction(siret)
      if (!result.ok) {
        setLookupError(result.error)
        return
      }
      const { data } = result
      setCompanyName(data.companyName)
      setAddress(data.address ?? '')
      setPostalCode(data.postalCode ?? '')
      setCity(data.city ?? '')
      setCategorieJuridique(data.categorieJuridique ?? '')
      setNafSource('SIRENE')
      if (data.nafNomenclature === 'V2025') setNaf2025(data.nafCode ?? '')
      else if (data.nafNomenclature === 'REV2') setNafRev2(data.nafCode ?? '')
    })
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
      {mode === 'edit' && <input type="hidden" name="id" value={clientId} />}
      <input type="hidden" name="nafSource" value={nafSource} />
      <input type="hidden" name="isPublicSector" value={isPublicSector ? 'on' : ''} />

      {state?.formError && (
        <div className="badge badge-danger" style={{ width: 'fit-content' }}>
          {state.formError}
        </div>
      )}

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          SIRET
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">SIRET</label>
            <input
              className="input"
              name="siret"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              placeholder="14 chiffres"
            />
            {errors.siret && <FieldError messages={errors.siret} />}
          </div>
          <button
            type="button"
            className="btn btn-md btn-secondary"
            disabled={lookupPending}
            onClick={runLookup}
          >
            {lookupPending ? 'Recherche…' : 'Rechercher via SIRENE'}
          </button>
        </div>
        {lookupError && (
          <p className="t-caption-1" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-3)' }}>
            {lookupError}
          </p>
        )}
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          La recherche renseigne automatiquement la raison sociale, l&apos;adresse, le NAF et la
          catégorie juridique. Aucune autre saisie n&apos;est nécessaire.
        </p>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">SIREN</label>
          <input className="input" name="siren" defaultValue={v.siren} />
          {errors.siren && <FieldError messages={errors.siren} />}
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Identité
        </h2>
        <div>
          <label className="input-label">Raison sociale</label>
          <input
            className="input"
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
          {errors.companyName && <FieldError messages={errors.companyName} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">NAF (rév. 2)</label>
            <input className="input" name="nafRev2" value={nafRev2} onChange={(e) => setNafRev2(e.target.value)} />
          </div>
          <div>
            <label className="input-label">NAF (2025)</label>
            <input className="input" name="naf2025" value={naf2025} onChange={(e) => setNaf2025(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Catégorie juridique (INSEE)</label>
          <input
            className="input"
            name="categorieJuridique"
            value={categorieJuridique}
            onChange={(e) => setCategorieJuridique(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <input
            type="checkbox"
            checked={isPublicSectorOverride}
            onChange={(e) => setIsPublicSectorOverride(e.target.checked)}
          />
          <span className="t-body-sm">Secteur public (forcer manuellement)</span>
        </label>

        {isPublicSector && (
          <div className="badge badge-warning" style={{ marginTop: 'var(--space-4)', width: 'fit-content' }}>
            Secteur public — Facture via Chorus Pro
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Adresse
        </h2>
        <div>
          <label className="input-label">Adresse</label>
          <input className="input" name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Code postal</label>
            <input
              className="input"
              name="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            {errors.postalCode && <FieldError messages={errors.postalCode} />}
          </div>
          <div>
            <label className="input-label">Ville</label>
            <input className="input" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Région PANDO</label>
          <input className="input" name="region" defaultValue={v.region} />
        </div>
      </div>

      <div className="card">
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Pipeline
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Statut</label>
            <select className="input" name="status" defaultValue={v.status}>
              {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Origine</label>
            <select className="input" name="origin" defaultValue={v.origin}>
              {Object.entries(CLIENT_ORIGIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Chargé de compte</label>
          <select className="input" name="assignedToId" defaultValue={v.assignedToId}>
            <option value="">— Non assigné —</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <label className="input-label">Commentaires</label>
          <textarea className="input" name="comments" defaultValue={v.comments} rows={3} />
        </div>
      </div>

      <button type="submit" className="btn btn-lg btn-primary" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le client' : 'Enregistrer'}
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
