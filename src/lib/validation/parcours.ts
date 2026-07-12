import { z } from 'zod'

/** Decimal-shaped string — passed straight to Prisma's Decimal fields, never round-tripped through a JS number. */
const decimalString = (maxIntDigits: number) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{1,${maxIntDigits}}(\\.\\d{1,2})?$`), 'Nombre invalide')

/**
 * `formationId` is only used at CREATE time to pick the current
 * FormationVersion to snapshot onto the parcours — it is not a field on the
 * Parcours model. Once created, the formationVersionId is frozen: editing the
 * source Formation later must never change an existing parcours.
 *
 * dateDebut / dateFin / totalHours / montantHT are intentionally absent —
 * they are DERIVED and there is no input for them anywhere in this schema.
 */
export const parcoursInputSchema = z
  .object({
    reference: z.string().trim().min(1, 'Référence requise'),
    formationId: z.string().trim().min(1, 'Formation requise'),
    pandoRole: z.enum(['PRESTATAIRE_DIRECT', 'SOUS_TRAITANT']),
    track: z.enum(['INTRA', 'INTER']),
    status: z.enum(['BROUILLON', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE']),
    clientId: z.string().trim().min(1).nullable().optional(),
    beneficiaireId: z.string().trim().min(1).nullable().optional(),
    donneurOrdreId: z.string().trim().min(1).nullable().optional(),
    minParticipants: z.coerce.number().int().positive().nullable().optional(),
    maxParticipants: z.coerce.number().int().positive().nullable().optional(),
    delaiReglement: z.coerce.number().int().nonnegative().default(30),
    cancellationReason: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // 🔴 CHECK 3 at the validation layer — no silent cancellation.
    if (data.status === 'ANNULE' && !data.cancellationReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['cancellationReason'],
        message: 'Un motif est requis pour annuler un parcours',
      })
    }
    // 🔴 CHECK 4 at the validation layer — sous-traitance needs a donneur d'ordre.
    if (data.pandoRole === 'SOUS_TRAITANT' && !data.donneurOrdreId) {
      ctx.addIssue({
        code: 'custom',
        path: ['donneurOrdreId'],
        message: "Un donneur d'ordre est requis en sous-traitance",
      })
    }
    if (
      data.minParticipants != null &&
      data.maxParticipants != null &&
      data.minParticipants > data.maxParticipants
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['minParticipants'],
        message: 'Le minimum ne peut pas dépasser le maximum',
      })
    }
  })

export type ParcoursInput = z.infer<typeof parcoursInputSchema>

export const sequenceInputSchema = z.object({
  ordre: z.coerce.number().int().positive(),
  titre: z.string().trim().min(1, 'Titre requis'),
  type: z.enum(['PRESENTIEL', 'DISTANCIEL', 'ELEARNING', 'COACHING', 'TRAVAIL_AUTONOME', 'DEFI']),
  date: z.string().trim().min(1, 'Date requise'),
  // 🔴 THE LEGAL UNIT. At least one demi-journée — mirrors the DB CHECK.
  demiJournees: z.array(z.enum(['MATIN', 'APRES_MIDI'])).min(1, 'Au moins une demi-journée requise'),
  heures: decimalString(5),
  lieu: z.string().trim().optional().nullable(),
  preuveType: z.enum(['SIGNATURE', 'CONNEXION', 'COMPLETION', 'COMPTE_RENDU', 'PAPER']),
  formateurId: z.string().trim().min(1).nullable().optional(),
})

export type SequenceInput = z.infer<typeof sequenceInputSchema>
