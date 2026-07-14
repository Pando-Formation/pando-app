export const SITUATION_LABELS: Record<string, string> = {
  SALARIE: 'Salarié',
  PARTICULIER: 'Particulier (auto-financé)',
  INDEPENDANT: 'Indépendant',
}

export const PAYER_TYPE_LABELS: Record<string, string> = {
  ORGANISATION: 'Organisation (employeur)',
  INDIVIDU: 'Individu (auto-financé)',
  OPCO: 'OPCO',
  DONNEUR_ORDRE: "Donneur d'ordre",
}

export const CONTRACTUALISATION_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  DEVIS_ENVOYE: 'Devis envoyé',
  DEVIS_SIGNE: 'Devis signé',
  CONVENTION_ENVOYEE: 'Convention envoyée',
  CONVENTION_SIGNEE: 'Convention signée',
  FACTUREE: 'Facturée',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
}

/// 🔴 THE PIPELINE. Mirrors ContractualisationStatus minus ANNULEE (a
/// cancelled deal is a dead end, never a rung on this ladder). Lives here
/// (not in lib/document.ts) so both the server-only document generators and
/// the client-side table component can import it — document.ts pulls in
/// fs/Prisma and can never be imported from a 'use client' file.
export const CONTRACTUALISATION_STATUS_ORDER = [
  'BROUILLON',
  'DEVIS_ENVOYE',
  'DEVIS_SIGNE',
  'CONVENTION_ENVOYEE',
  'CONVENTION_SIGNEE',
  'FACTUREE',
  'PAYEE',
] as const
export type ProgressableStatus = (typeof CONTRACTUALISATION_STATUS_ORDER)[number]

/** Single source of truth for "has this pipeline reached step X yet" — used
 * both by the server-side generation gates (lib/document.ts) and the table's
 * menu-item visibility, so the two can never disagree on the ordering. */
export function isContractualisationAtLeast(status: string, target: ProgressableStatus): boolean {
  const index = CONTRACTUALISATION_STATUS_ORDER.indexOf(status as ProgressableStatus)
  return index >= 0 && index >= CONTRACTUALISATION_STATUS_ORDER.indexOf(target)
}

export const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  INSCRIT: 'Inscrit',
  CONVOQUE: 'Convoqué',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ABANDON: 'Abandon',
  ABSENT: 'Absent',
  ANNULE: 'Annulé',
}

export const FINANCEMENT_TYPE_LABELS: Record<string, string> = {
  ENTREPRISE_DIRECTE: 'Entreprise directe',
  OPCO: 'OPCO',
  CPF: 'CPF',
  FONDS_PROPRES: 'Fonds propres',
  AUTRE: 'Autre',
}
