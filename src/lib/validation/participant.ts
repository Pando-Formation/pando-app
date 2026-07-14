import { z } from 'zod'

export const participantInputSchema = z.object({
  civilite: z.enum(['MADAME', 'MONSIEUR', 'AUTRE']).nullable().optional(),
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  email: z.string().trim().email('E-mail invalide'),
  address: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  fonction: z.string().trim().optional().nullable(),
  situation: z.enum(['SALARIE', 'PARTICULIER', 'INDEPENDANT']),
  clientId: z.string().trim().min(1).nullable().optional(),
})

export type ParticipantInput = z.infer<typeof participantInputSchema>

export const financeurInputSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  siret: z.string().trim().optional().nullable(),
  type: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email('E-mail invalide').optional().nullable().or(z.literal('')),
})

export type FinanceurInput = z.infer<typeof financeurInputSchema>

/**
 * `payerId` is generic — which FK it resolves to (payerClientId /
 * payerParticipantId / financeurId) depends on payerType. Exactly one target
 * is ever set, mirroring CHECK 8 (contract_one_payer) at the app layer before
 * it ever reaches Postgres.
 *
 * 🔴 retractationEndsAt is NOT user input for INDIVIDU payers — see
 * src/lib/participant.ts, which computes it as +10 days unconditionally.
 * It is accepted here only so an already-computed value round-trips on edit.
 */
export const contractualisationInputSchema = z.object({
  payerType: z.enum(['ORGANISATION', 'INDIVIDU', 'OPCO', 'DONNEUR_ORDRE']),
  payerId: z.string().trim().min(1, 'Payeur requis'),
  delaiReglement: z.coerce.number().int().nonnegative().nullable().optional(),
  numeroEngagement: z.string().trim().optional().nullable(),
  codeService: z.string().trim().optional().nullable(),
})

export type ContractualisationInput = z.infer<typeof contractualisationInputSchema>

export const financementInputSchema = z.object({
  type: z.enum(['ENTREPRISE_DIRECTE', 'OPCO', 'CPF', 'FONDS_PROPRES', 'AUTRE']),
  financeurId: z.string().trim().min(1).nullable().optional(),
  dossierNumber: z.string().trim().optional().nullable(),
  montantPrisEnCharge: z.coerce.number().int().nonnegative(), // cents
})

export type FinancementInput = z.infer<typeof financementInputSchema>

export const enrollParticipantInputSchema = z.object({
  participantId: z.string().trim().min(1, 'Participant requis'),
  contractualisationId: z.string().trim().min(1).nullable().optional(),
})

export type EnrollParticipantInput = z.infer<typeof enrollParticipantInputSchema>

/**
 * 🔴 CHECK 5 at the validation layer — an abandon is a managed event, not a
 * gap: a reason is required. Mirrors the Slice 3/4 dual-layer pattern.
 */
export const parcoursParticipantInputSchema = z
  .object({
    status: z.enum(['INSCRIT', 'CONVOQUE', 'EN_COURS', 'TERMINE', 'ABANDON', 'ABSENT', 'ANNULE']),
    abandonReason: z.string().trim().optional().nullable(),
    besoinAccessibilite: z.string().trim().optional().nullable(),
    adaptationProposee: z.string().trim().optional().nullable(),
    traceResponse: z.boolean().default(false), // sets adaptationTraceeAt = now when true
    referentHandicapId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'ABANDON' && !data.abandonReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['abandonReason'],
        message: 'Un motif est requis pour un abandon',
      })
    }
  })

export type ParcoursParticipantInput = z.infer<typeof parcoursParticipantInputSchema>
