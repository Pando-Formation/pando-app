/** Plain label maps for catalogue enums — safe to import from client components (no db/server imports). */

export const FORMAT_LABELS: Record<string, string> = {
  PRESENTIEL: 'Présentiel',
  DISTANCIEL: 'Distanciel',
  ELEARNING: 'E-learning',
  PRESENTIEL_DISTANCIEL: 'Présentiel + distanciel',
  PRESENTIEL_ELEARNING: 'Présentiel + e-learning',
  DISTANCIEL_ELEARNING: 'Distanciel + e-learning',
  MIXTE_COMPLET: 'Mixte complet',
}

export const BRAND_PROGRAMME_LABELS: Record<string, string> = {
  BAM: 'BAM!',
  POP: 'POP!',
  CLIC: 'CLIC!',
  WOW: 'WOW!',
}

export const PRESTATION_CODE_LABELS: Record<string, string> = {
  DIPLOME: 'Diplôme',
  CERTIFICATION: 'Certification',
  CQP_NON_ENREGISTRE: 'CQP non enregistré',
  AUTRE_ACTION_FORMATION: 'Autre action de formation',
  BILAN_COMPETENCES: 'Bilan de compétences',
  VAE: 'VAE',
}
