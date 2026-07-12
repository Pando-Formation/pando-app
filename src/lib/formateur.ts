import { db } from '@/lib/db'
import type { FormateurInput, CompetenceInput } from '@/lib/validation/formateur'

function toPrismaData(input: FormateurInput) {
  const isInternal = input.contractType !== 'EXTERNE_PRESTATAIRE'
  return {
    civilite: input.civilite || null,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    address: input.address || null,
    postalCode: input.postalCode || null,
    city: input.city || null,
    contractType: input.contractType,
    // 🔴 CHECK 1 belt-and-braces — enforced by zod already, re-asserted here
    // so this function can never write a phantom convention even if called
    // directly, bypassing the form.
    siren: isInternal ? null : input.siren || null,
    nda: isInternal ? null : input.nda || null,
    tvaRate: input.tvaRate,
    tarifJour: input.tarifJour ?? null,
    forfaitDeplacement: input.forfaitDeplacement,
    isQualiopiCertified: input.isQualiopiCertified,
    expertises: input.expertises,
    yearsFormation: input.yearsFormation ?? null,
    yearsManagement: input.yearsManagement ?? null,
    availabilityNotes: input.availabilityNotes || null,
  }
}

export async function createFormateur(input: FormateurInput) {
  return db.formateur.create({ data: toPrismaData(input) })
}

export async function updateFormateur(id: string, input: FormateurInput) {
  return db.formateur.update({ where: { id }, data: toPrismaData(input) })
}

export async function archiveFormateur(id: string) {
  return db.formateur.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
}

export async function restoreFormateur(id: string) {
  return db.formateur.update({ where: { id }, data: { deletedAt: null, isActive: true } })
}

export async function addCompetence(formateurId: string, input: CompetenceInput) {
  return db.formateurCompetence.create({
    data: {
      formateurId,
      type: input.type,
      title: input.title,
      date: new Date(input.date),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  })
}

export type CompetenceStatus = 'expired' | 'expiring_soon' | 'ok'

/**
 * 🔴 Criterion 5 — a lapsed certification delivering a parcours is a
 * non-conformity. Alert BEFORE expiry, not after: <60 days is the warning
 * window (docs/V1_SLICES.md Slice 3 acceptance).
 */
export function competenceStatus(expiresAt: Date | null): CompetenceStatus | null {
  if (!expiresAt) return null
  const daysLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'expired'
  if (daysLeft < 60) return 'expiring_soon'
  return 'ok'
}
