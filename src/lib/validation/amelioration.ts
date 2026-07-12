import { z } from 'zod'

/** YYYY-MM-DD from `<input type="date">`, checked for real calendar validity. */
const isoDateString = (message = 'Date invalide') =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((s) => !Number.isNaN(new Date(s).getTime()), message)

export const reclamationInputSchema = z.object({
  source: z.enum(['PARTICIPANT', 'CLIENT', 'FORMATEUR', 'FINANCEUR', 'AUTRE']),
  receivedAt: isoDateString('Date requise'),
  receivedVia: z.string().trim().optional().nullable(),
  description: z.string().trim().min(1, 'Description requise'),
  qualification: z.string().trim().optional().nullable(),
  confidentiality: z.enum(['PUBLIC', 'INTERNE', 'RESTREINT', 'CONFIDENTIEL']).default('INTERNE'),
})
export type ReclamationInput = z.infer<typeof reclamationInputSchema>

export const reclamationResponseInputSchema = z.object({
  responseText: z.string().trim().min(1, 'Réponse requise'),
  close: z.boolean().default(false),
})
export type ReclamationResponseInput = z.infer<typeof reclamationResponseInputSchema>

export const actionInputSchema = z.object({
  origin: z.enum(['RECLAMATION', 'EVALUATION', 'AUDIT', 'VEILLE', 'INTERNE']),
  description: z.string().trim().min(1, 'Description requise'),
  ownerId: z.string().trim().min(1, 'Un responsable nommé est requis'),
  dueDate: isoDateString('Échéance requise'),
})
export type ActionInput = z.infer<typeof actionInputSchema>

/// 🔴 "Actioned" is not an outcome — the field asks what concretely changed.
export const actionOutcomeInputSchema = z.object({
  outcome: z.string().trim().min(1, 'Un résultat concret est requis'),
})
export type ActionOutcomeInput = z.infer<typeof actionOutcomeInputSchema>

export const veilleInputSchema = z.object({
  type: z.enum(['LEGALE', 'METIER', 'PEDAGOGIQUE', 'HANDICAP', 'INNOVATION']),
  source: z.string().trim().min(1, 'Source requise'),
  summary: z.string().trim().min(1, 'Résumé requis'),
  soWhat: z.string().trim().min(1, 'Ce qui change chez PANDO est requis'),
  date: isoDateString('Date requise'),
})
export type VeilleInput = z.infer<typeof veilleInputSchema>
