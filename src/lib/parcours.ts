import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { FormationSnapshot } from '@/lib/formation'
import type { ParcoursInput, SequenceInput } from '@/lib/validation/parcours'

/**
 * 🔴 DERIVED TOTALS — never entered by hand. See 0002_check_constraints §C.
 *   dateDebut  = MIN(sequences.date)
 *   dateFin    = MAX(sequences.date)
 *   totalHours = Σ sequences.heures
 *
 * Called after every sequence create/update/delete. There is no code path
 * that writes these three fields any other way — see parcoursInputSchema
 * and sequenceInputSchema, neither of which accepts them as input.
 */
export async function recomputeParcoursDerived(parcoursId: string, tx: Prisma.TransactionClient = db) {
  const agg = await tx.sequence.aggregate({
    where: { parcoursId },
    _min: { date: true },
    _max: { date: true },
    _sum: { heures: true },
  })
  return tx.parcours.update({
    where: { id: parcoursId },
    data: {
      dateDebut: agg._min.date ?? null,
      dateFin: agg._max.date ?? null,
      totalHours: agg._sum.heures ?? 0,
    },
  })
}

/** 🔴 DERIVED — Parcours.montantHT = Σ contractualisations.montantHT. Slice 5 territory, defined here since Parcours owns the field. */
export async function recomputeParcoursMontant(parcoursId: string, tx: Prisma.TransactionClient = db) {
  const agg = await tx.contractualisation.aggregate({
    where: { parcoursId, status: { not: 'ANNULEE' } },
    _sum: { montantHT: true },
  })
  return tx.parcours.update({
    where: { id: parcoursId },
    data: { montantHT: agg._sum.montantHT ?? 0 },
  })
}

function toPrismaData(input: ParcoursInput) {
  return {
    reference: input.reference,
    pandoRole: input.pandoRole,
    track: input.track,
    status: input.status,
    clientId: input.track === 'INTER' ? null : (input.clientId ?? null),
    beneficiaireId: input.beneficiaireId ?? null,
    donneurOrdreId: input.pandoRole === 'SOUS_TRAITANT' ? (input.donneurOrdreId ?? null) : null,
    minParticipants: input.minParticipants ?? null,
    maxParticipants: input.maxParticipants ?? null,
    delaiReglement: input.delaiReglement,
    cancellationReason: input.status === 'ANNULE' ? (input.cancellationReason ?? null) : null,
  }
}

class RequiresFullCohortError extends Error {}

/** Application-layer rule (§D) — not expressible as a single-table CHECK: requiresFullCohort → min = max. */
async function assertFullCohortCoherence(formationVersionId: string, input: ParcoursInput) {
  const version = await db.formationVersion.findUniqueOrThrow({ where: { id: formationVersionId } })
  const snapshot = version.snapshot as unknown as FormationSnapshot
  if (snapshot.requiresFullCohort && input.minParticipants !== input.maxParticipants) {
    throw new RequiresFullCohortError(
      `${snapshot.title} exige un collectif complet : le minimum et le maximum de participants doivent être identiques.`,
    )
  }
}

/** 🔴 SNAPSHOT, frozen at creation. `formationId` picks the FormationVersion to freeze — it is never stored as-is. */
export async function createParcours(input: ParcoursInput) {
  const version = await db.formationVersion.findFirst({
    where: { formationId: input.formationId },
    orderBy: { version: 'desc' },
  })
  if (!version) throw new Error('Aucune version de formation trouvée pour ce programme.')

  await assertFullCohortCoherence(version.id, input)

  return db.parcours.create({
    data: { ...toPrismaData(input), formationVersionId: version.id },
  })
}

/**
 * 🔴 formationVersionId is IMMUTABLE after creation — editing the source
 * Formation must never change what an existing parcours is contracted
 * against. This function never touches it.
 */
export async function updateParcours(parcoursId: string, input: ParcoursInput) {
  const existing = await db.parcours.findUniqueOrThrow({ where: { id: parcoursId } })
  await assertFullCohortCoherence(existing.formationVersionId, input)

  return db.parcours.update({
    where: { id: parcoursId },
    data: toPrismaData(input),
  })
}

function sequencePrismaData(input: SequenceInput) {
  return {
    ordre: input.ordre,
    titre: input.titre,
    type: input.type,
    date: new Date(input.date),
    demiJournees: input.demiJournees,
    heures: input.heures,
    lieu: input.lieu ?? null,
    preuveType: input.preuveType,
    formateurId: input.formateurId ?? null,
  }
}

export async function addSequence(parcoursId: string, input: SequenceInput) {
  return db.$transaction(async (tx) => {
    const sequence = await tx.sequence.create({
      data: { parcoursId, ...sequencePrismaData(input) },
    })
    await recomputeParcoursDerived(parcoursId, tx)
    return sequence
  })
}

export async function updateSequence(sequenceId: string, input: SequenceInput) {
  return db.$transaction(async (tx) => {
    const sequence = await tx.sequence.update({
      where: { id: sequenceId },
      data: sequencePrismaData(input),
    })
    await recomputeParcoursDerived(sequence.parcoursId, tx)
    return sequence
  })
}

export async function deleteSequence(sequenceId: string) {
  return db.$transaction(async (tx) => {
    const sequence = await tx.sequence.delete({ where: { id: sequenceId } })
    await recomputeParcoursDerived(sequence.parcoursId, tx)
    return sequence
  })
}
