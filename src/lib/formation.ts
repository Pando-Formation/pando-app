import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { FormationInput } from '@/lib/validation/formation'

/** Eager-load shape used everywhere a full Formation needs to be snapshotted or rendered. */
export const formationWithSpecialite = {
  include: {
    specialite: {
      include: {
        groupe: { include: { domaine: { include: { grandDomaine: true } } } },
        champs: true,
      },
    },
  },
} satisfies Prisma.FormationDefaultArgs

type FormationWithSpecialite = Prisma.FormationGetPayload<typeof formationWithSpecialite>

/**
 * Plain-JSON shape frozen onto FormationVersion.snapshot. Denormalizes the
 * NSF labels so the PDF renderer (and any later document generator) never
 * needs a live join — it reads only from this snapshot, never the live
 * Formation row. See AGENTS.md §4 "Documents".
 */
export type FormationSnapshot = {
  internalCode: string
  title: string
  subtitle: string | null
  brandProgramme: string | null
  requiresFullCohort: boolean
  intraOnly: boolean
  durationHours: string
  durationDays: string
  format: string
  prerequisites: string
  targetAudience: string
  pedagogicObjectives: string[]
  methodesPedagogiques: string | null
  modalitesEvaluation: string | null
  delaiAcces: string
  accessibilite: string
  priceIntraPerDay: number | null
  priceInterPerPerson: number | null
  bpfIncluded: boolean
  prestationCode: string | null
  specialite: {
    code: string
    titre: string
    champs: { code: string; titre: string }
    groupe: { code: string; titre: string }
    domaine: { code: string; titre: string }
    grandDomaine: { code: string; titre: string }
  } | null
}

export function buildSnapshot(formation: FormationWithSpecialite): FormationSnapshot {
  const s = formation.specialite
  return {
    internalCode: formation.internalCode,
    title: formation.title,
    subtitle: formation.subtitle,
    brandProgramme: formation.brandProgramme,
    requiresFullCohort: formation.requiresFullCohort,
    intraOnly: formation.intraOnly,
    durationHours: formation.durationHours.toString(),
    durationDays: formation.durationDays.toString(),
    format: formation.format,
    prerequisites: formation.prerequisites,
    targetAudience: formation.targetAudience,
    pedagogicObjectives: formation.pedagogicObjectives,
    methodesPedagogiques: formation.methodesPedagogiques,
    modalitesEvaluation: formation.modalitesEvaluation,
    delaiAcces: formation.delaiAcces,
    accessibilite: formation.accessibilite,
    priceIntraPerDay: formation.priceIntraPerDay,
    priceInterPerPerson: formation.priceInterPerPerson,
    bpfIncluded: formation.bpfIncluded,
    prestationCode: formation.prestationCode,
    specialite: s
      ? {
          code: s.code,
          titre: s.titre,
          champs: { code: s.champs.code, titre: s.champs.titre },
          groupe: { code: s.groupe.code, titre: s.groupe.titre },
          domaine: { code: s.groupe.domaine.code, titre: s.groupe.domaine.titre },
          grandDomaine: {
            code: s.groupe.domaine.grandDomaine.code,
            titre: s.groupe.domaine.grandDomaine.titre,
          },
        }
      : null,
  }
}

async function nextVersionNumber(
  tx: Prisma.TransactionClient,
  formationId: string,
): Promise<number> {
  const agg = await tx.formationVersion.aggregate({
    where: { formationId },
    _max: { version: true },
  })
  return (agg._max.version ?? 0) + 1
}

function toPrismaData(input: FormationInput) {
  return {
    internalCode: input.internalCode,
    title: input.title,
    subtitle: input.subtitle ?? null,
    brandProgramme: input.brandProgramme ?? null,
    requiresFullCohort: input.requiresFullCohort,
    intraOnly: input.intraOnly,
    durationHours: input.durationHours,
    durationDays: input.durationDays,
    format: input.format,
    prerequisites: input.prerequisites,
    targetAudience: input.targetAudience,
    pedagogicObjectives: input.pedagogicObjectives,
    methodesPedagogiques: input.methodesPedagogiques ?? null,
    modalitesEvaluation: input.modalitesEvaluation ?? null,
    delaiAcces: input.delaiAcces,
    accessibilite: input.accessibilite,
    priceIntraPerDay: input.priceIntraPerDay ?? null,
    priceInterPerPerson: input.priceInterPerPerson ?? null,
    bpfIncluded: input.bpfIncluded,
    prestationCode: input.prestationCode ?? null,
    specialiteId: input.specialiteId ?? null,
  }
}

export async function createFormationWithVersion(input: FormationInput) {
  return db.$transaction(async (tx) => {
    const created = await tx.formation.create({ data: toPrismaData(input) })
    const reloaded = await tx.formation.findUniqueOrThrow({
      where: { id: created.id },
      ...formationWithSpecialite,
    })
    const snapshot = buildSnapshot(reloaded)
    await tx.formationVersion.create({
      data: { formationId: created.id, version: 1, snapshot },
    })
    return reloaded
  })
}

/**
 * Every successful update mints a new FormationVersion unconditionally — no
 * diffing against the previous snapshot. Formation is immutable-by-history:
 * editing objectives in 2027 must not retroactively alter what a client
 * signed against in 2026. See AGENTS.md §4, docs/V1_SLICES.md Slice 1.
 */
export async function updateFormationWithVersion(formationId: string, input: FormationInput) {
  return db.$transaction(async (tx) => {
    await tx.formation.update({ where: { id: formationId }, data: toPrismaData(input) })
    const reloaded = await tx.formation.findUniqueOrThrow({
      where: { id: formationId },
      ...formationWithSpecialite,
    })
    const version = await nextVersionNumber(tx, formationId)
    const snapshot = buildSnapshot(reloaded)
    await tx.formationVersion.create({ data: { formationId, version, snapshot } })
    return reloaded
  })
}

/** Archiving isn't a content edit — flips isActive only, mints no new version. */
export async function toggleFormationActive(formationId: string, isActive: boolean) {
  return db.formation.update({ where: { id: formationId }, data: { isActive } })
}
