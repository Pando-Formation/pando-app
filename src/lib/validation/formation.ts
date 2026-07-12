import { z } from 'zod'

/** Decimal-shaped string — passed straight to Prisma's Decimal fields, never round-tripped through a JS number. */
const decimalString = (maxIntDigits: number) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{1,${maxIntDigits}}(\\.\\d{1,2})?$`), 'Nombre invalide')

/**
 * Shared by create AND update — every save represents the full coherent
 * state that gets snapshotted onto a new FormationVersion. There is no
 * partial-patch concept in this versioning model.
 */
export const formationInputSchema = z.object({
  internalCode: z.string().trim().min(1, 'Code requis').max(32),
  title: z.string().trim().min(1, 'Titre requis'),
  subtitle: z.string().trim().optional().nullable(),
  brandProgramme: z.enum(['BAM', 'POP', 'CLIC', 'WOW']).nullable().optional(),

  requiresFullCohort: z.boolean().default(false),
  intraOnly: z.boolean().default(false),

  durationHours: decimalString(4), // Decimal(6,2)
  durationDays: decimalString(3), // Decimal(5,2)

  format: z.enum([
    'PRESENTIEL',
    'DISTANCIEL',
    'ELEARNING',
    'PRESENTIEL_DISTANCIEL',
    'PRESENTIEL_ELEARNING',
    'DISTANCIEL_ELEARNING',
    'MIXTE_COMPLET',
  ]),

  prerequisites: z.string().trim().min(1, 'Prérequis requis'),
  targetAudience: z.string().trim().min(1, 'Public visé requis'),

  // 🔴 Array, not objectif1/2/3 — BAM! has five. No max — do not reproduce the cap.
  pedagogicObjectives: z.array(z.string().trim().min(1)).min(1, 'Au moins un objectif requis'),

  methodesPedagogiques: z.string().trim().optional().nullable(),
  modalitesEvaluation: z.string().trim().optional().nullable(),

  // 🔴 Criterion 1 — must be published.
  delaiAcces: z.string().trim().min(1, "Délai d'accès requis"),
  // 🔴 Criterion 3 — accessibility statement.
  accessibilite: z.string().trim().min(1, 'Accessibilité requise'),

  priceIntraPerDay: z.coerce.number().int().nonnegative().nullable().optional(), // cents
  priceInterPerPerson: z.coerce.number().int().nonnegative().nullable().optional(), // cents

  bpfIncluded: z.boolean().default(true),
  prestationCode: z
    .enum(['DIPLOME', 'CERTIFICATION', 'CQP_NON_ENREGISTRE', 'AUTRE_ACTION_FORMATION', 'BILAN_COMPETENCES', 'VAE'])
    .nullable()
    .optional(),

  specialiteId: z.string().trim().min(1).nullable().optional(),
})

export type FormationInput = z.infer<typeof formationInputSchema>
