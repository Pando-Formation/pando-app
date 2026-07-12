import { z } from 'zod'

const siren = z.string().trim().regex(/^[0-9]{9}$/, 'Le SIREN doit contenir exactement 9 chiffres.')
const postalCode = z.string().trim().regex(/^[0-9]{5}$/, 'Le code postal doit contenir exactement 5 chiffres.')
/** Decimal(4,2) — a rate between 0 and 1 (0.20 = 20%), 2 decimal places. */
const tvaRate = z
  .string()
  .trim()
  .regex(/^(0(\.\d{1,2})?|1(\.0{1,2})?)$/, 'Le taux de TVA doit être entre 0 et 1 (ex. 0.20 pour 20%).')
/** YYYY-MM-DD from `<input type="date">`, checked for real calendar validity. */
const isoDateString = (message = 'Date invalide') =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((s) => !Number.isNaN(new Date(s).getTime()), message)

export const formateurInputSchema = z
  .object({
    civilite: z.enum(['MADAME', 'MONSIEUR', 'AUTRE']).nullable().optional(),
    firstName: z.string().trim().min(1, 'Prénom requis'),
    lastName: z.string().trim().min(1, 'Nom requis'),
    email: z.string().trim().email('E-mail invalide'),
    phone: z.string().trim().nullable().optional(),
    address: z.string().trim().nullable().optional(),
    postalCode: z.union([postalCode, z.literal('')]).nullable().optional(),
    city: z.string().trim().nullable().optional(),

    contractType: z.enum(['INTERNE_DIRIGEANT', 'INTERNE_SALARIE', 'EXTERNE_PRESTATAIRE']),

    // 🔴 EXTERNAL ONLY — [CHECK 1] rejects siren/nda on an internal formateur.
    // The live sheet pasted the CLIENT's SIREN into an internal formateur's
    // cell (2026-ST100, a convention describing a relationship that doesn't
    // exist). Validated here too so the form explains the rejection instead
    // of surfacing a raw Postgres CHECK-constraint error.
    siren: z.union([siren, z.literal('')]).nullable().optional(),
    nda: z.string().trim().nullable().optional(),

    tvaRate,
    tarifJour: z.coerce.number().int().nonnegative().nullable().optional(), // cents
    forfaitDeplacement: z.coerce.number().int().nonnegative().default(0), // cents

    isQualiopiCertified: z.boolean().default(false),
    expertises: z.array(z.string().trim().min(1)).default([]),
    yearsFormation: z.coerce.number().int().nonnegative().nullable().optional(),
    yearsManagement: z.coerce.number().int().nonnegative().nullable().optional(),
    availabilityNotes: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.contractType === 'EXTERNE_PRESTATAIRE' || (!data.siren && !data.nda), {
    message: 'SIREN et NDA sont réservés aux formateurs externes — un formateur interne ne peut pas en porter.',
    path: ['siren'],
  })

export type FormateurInput = z.infer<typeof formateurInputSchema>

export const competenceInputSchema = z.object({
  type: z.enum(['CV', 'DIPLOME', 'CERTIFICATION', 'FORMATION_CONTINUE', 'SUPERVISION']),
  title: z.string().trim().min(1, 'Titre requis'),
  date: isoDateString('Date requise'),
  expiresAt: isoDateString().nullable().optional(),
})

export type CompetenceInput = z.infer<typeof competenceInputSchema>
