import { z } from 'zod'

/**
 * 🔴 SIRET/SIREN/postcode are String, always, and validated by exact digit
 * count — matching the DB CHECK constraints (0002_check_constraints) so a
 * bad paste is rejected with a clear message here, not an opaque Postgres
 * error. The live sheet stores SIRET as a float (5.0837292700014E13) and
 * postcode as e.g. 9200 (leading zero lost) — both must fail, explicitly.
 */
const siret = z
  .string()
  .trim()
  .regex(/^[0-9]{14}$/, 'Le SIRET doit contenir exactement 14 chiffres (jamais un nombre — les zéros initiaux comptent).')
const siren = z
  .string()
  .trim()
  .regex(/^[0-9]{9}$/, 'Le SIREN doit contenir exactement 9 chiffres.')
const postalCode = z
  .string()
  .trim()
  .regex(/^[0-9]{5}$/, 'Le code postal doit contenir exactement 5 chiffres (ex. 92000, jamais 9200).')

export const clientInputSchema = z.object({
  companyName: z.string().trim().min(1, 'Raison sociale requise'),
  siret: z.union([siret, z.literal('')]).nullable().optional(),
  siren: z.union([siren, z.literal('')]).nullable().optional(),
  isPublicSector: z.boolean().default(false),
  categorieJuridique: z.string().trim().nullable().optional(),
  nafRev2: z.string().trim().nullable().optional(),
  naf2025: z.string().trim().nullable().optional(),
  nafSource: z.enum(['MANUAL', 'SIRENE']).default('MANUAL'),
  address: z.string().trim().nullable().optional(),
  postalCode: z.union([postalCode, z.literal('')]).nullable().optional(),
  city: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  status: z.enum(['PROSPECT', 'ACTIF', 'EN_PAUSE']).default('PROSPECT'),
  origin: z.enum(['DIRECT', 'APPEL_OFFRE', 'RESEAU', 'INBOUND_SITE']).default('DIRECT'),
  assignedToId: z.string().trim().nullable().optional(),
  comments: z.string().trim().nullable().optional(),
})

export type ClientInput = z.infer<typeof clientInputSchema>

export const clientContactInputSchema = z.object({
  roles: z.array(z.enum(['PRINCIPAL', 'ADMINISTRATIF', 'SIGNATAIRE'])).min(1, 'Au moins un rôle requis'),
  civilite: z.enum(['MADAME', 'MONSIEUR', 'AUTRE']).nullable().optional(),
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  fonction: z.string().trim().nullable().optional(),
  email: z.string().trim().email('E-mail invalide'),
  phone: z.string().trim().nullable().optional(),
})

export type ClientContactInput = z.infer<typeof clientContactInputSchema>
