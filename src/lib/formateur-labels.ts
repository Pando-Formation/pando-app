/** Plain label maps for formateur enums — safe to import from client components. */

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  INTERNE_DIRIGEANT: 'Interne — dirigeant',
  INTERNE_SALARIE: 'Interne — salarié',
  EXTERNE_PRESTATAIRE: 'Externe — prestataire',
}

export const COMPETENCE_TYPE_LABELS: Record<string, string> = {
  CV: 'CV',
  DIPLOME: 'Diplôme',
  CERTIFICATION: 'Certification',
  FORMATION_CONTINUE: 'Formation continue',
  SUPERVISION: 'Supervision',
}
