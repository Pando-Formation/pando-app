/** Plain label maps for client/contact enums — safe to import from client components. */

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  PROSPECT: 'Prospect',
  ACTIF: 'Actif',
  EN_PAUSE: 'En pause',
}

export const CLIENT_ORIGIN_LABELS: Record<string, string> = {
  DIRECT: 'Direct',
  APPEL_OFFRE: "Appel d'offre",
  RESEAU: 'Réseau',
  INBOUND_SITE: 'Site web',
}

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: 'Principal',
  ADMINISTRATIF: 'Administratif',
  SIGNATAIRE: 'Signataire',
}

export const CIVILITE_LABELS: Record<string, string> = {
  MADAME: 'Madame',
  MONSIEUR: 'Monsieur',
  AUTRE: 'Autre',
}
