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

export const PRICE_MODE_LABELS: Record<string, string> = {
  FORFAIT_JOUR: 'Forfait jour',
  PAR_PERSONNE: 'Par personne',
  NEGOCIE: 'Négocié',
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
