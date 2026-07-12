/**
 * INSEE Sirene API — SIRET lookup. Kills the float-SIRET corruption class:
 * Alexandra types a SIRET, this returns name/address/NAF/catégorie
 * juridique, she types nothing else (Slice 2 acceptance).
 *
 * 🔴 Split into a pure parser (`parseSireneEtablissement`, testable without
 * network access) and the fetch call (`lookupSiret`) — the fetch is the
 * ONE place that needs verifying against a real response once a real
 * INSEE_SIRENE_TOKEN exists (portail-api.insee.fr — free registration).
 * If the live shape drifts from what's coded here, this is the only file
 * that needs fixing.
 *
 * `categorieJuridiqueUniteLegale` starting with "7" = personne morale de
 * droit public — sources Client.isPublicSector (see src/lib/client.ts).
 */

export type SireneResult = {
  companyName: string
  address: string | null
  postalCode: string | null
  city: string | null
  categorieJuridique: string | null
  nafCode: string | null
  nafNomenclature: 'REV2' | 'V2025' | null
}

export class SireneConfigError extends Error {}
export class SireneNotFoundError extends Error {}

/** Pure — given the raw INSEE `/siret/{siret}` JSON body, extract what PANDO needs. */
export function parseSireneEtablissement(body: unknown): SireneResult {
  const etab = (body as any)?.etablissement
  if (!etab) throw new Error('Réponse SIRENE inattendue — aucun établissement trouvé dans la charge utile.')

  const uniteLegale = etab.uniteLegale ?? {}
  const adresse = etab.adresseEtablissement ?? {}
  const periode = etab.periodesEtablissement?.[0] ?? {}

  const companyName: string =
    uniteLegale.denominationUniteLegale ??
    [uniteLegale.prenom1UniteLegale, uniteLegale.nomUniteLegale].filter(Boolean).join(' ') ??
    ''

  const addressParts = [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement,
  ].filter(Boolean)

  const nomenclature: string | undefined = periode.nomenclatureActivitePrincipaleEtablissement
  const nafNomenclature: SireneResult['nafNomenclature'] = nomenclature
    ? nomenclature.includes('2025')
      ? 'V2025'
      : 'REV2'
    : null

  return {
    companyName,
    address: addressParts.length ? addressParts.join(' ') : null,
    postalCode: adresse.codePostalEtablissement ?? null,
    city: adresse.libelleCommuneEtablissement ?? null,
    categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale ?? null,
    nafCode: periode.activitePrincipaleEtablissement ?? null,
    nafNomenclature,
  }
}

export async function lookupSiret(siret: string): Promise<SireneResult> {
  const token = process.env.INSEE_SIRENE_TOKEN
  if (!token) {
    throw new SireneConfigError(
      "INSEE_SIRENE_TOKEN n'est pas configuré. Inscription gratuite sur portail-api.insee.fr, puis renseigner la variable dans .env.",
    )
  }

  const res = await fetch(`https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (res.status === 404) {
    throw new SireneNotFoundError(`Aucun établissement trouvé pour le SIRET ${siret}.`)
  }
  if (!res.ok) {
    throw new Error(`Erreur SIRENE (${res.status}) — réessayer plus tard.`)
  }

  return parseSireneEtablissement(await res.json())
}
