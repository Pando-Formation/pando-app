import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { FormationSnapshot } from '@/lib/formation'
import type { FormationSessionInput, ParcoursInput, SequenceInput } from '@/lib/validation/parcours'

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

async function computeParcoursSequenceTotal(parcoursId: string, tx: Prisma.TransactionClient = db): Promise<number> {
  const agg = await tx.sequence.aggregate({ where: { parcoursId }, _sum: { montantHT: true } })
  return agg._sum.montantHT ?? 0
}

/**
 * 🔴 DERIVED MONEY — sequence prices are list prices; contractualisations are
 * payer-scoped. INTRA contracts use the parcours sequence total once. INTER
 * contracts multiply that same sequence total by the number of participants
 * attached to THIS contractualisation. Parcours.montantHT is then the sum of
 * non-cancelled contractualisations.
 */
export async function recomputeMontants(parcoursId: string, tx: Prisma.TransactionClient = db) {
  const [parcours, sequenceTotal, contractualisations] = await Promise.all([
    tx.parcours.findUniqueOrThrow({ where: { id: parcoursId }, select: { track: true } }),
    computeParcoursSequenceTotal(parcoursId, tx),
    tx.contractualisation.findMany({
      where: { parcoursId, status: { not: 'ANNULEE' } },
      select: { id: true, _count: { select: { participants: true } } },
    }),
  ])

  let parcoursTotal = 0
  for (const contract of contractualisations) {
    const montantHT = parcours.track === 'INTER' ? sequenceTotal * contract._count.participants : sequenceTotal
    parcoursTotal += montantHT
    await tx.contractualisation.update({
      where: { id: contract.id },
      data: { montantHT },
    })
  }

  return tx.parcours.update({
    where: { id: parcoursId },
    data: { montantHT: parcoursTotal },
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

export async function addFormationSession(parcoursId: string, input: FormationSessionInput) {
  return db.$transaction(async (tx) => {
    const { _max } = await tx.formationSession.aggregate({
      where: { parcoursId },
      _max: { ordre: true },
    })
    return tx.formationSession.create({
      data: {
        parcoursId,
        ordre: (_max.ordre ?? 0) + 1,
        titre: input.titre,
      },
    })
  })
}

export async function updateFormationSession(sessionId: string, input: FormationSessionInput) {
  return db.formationSession.update({
    where: { id: sessionId },
    data: { titre: input.titre },
  })
}

async function resolveFormationSessionId(
  parcoursId: string,
  tx: Prisma.TransactionClient,
  formationSessionId?: string,
) {
  if (formationSessionId) {
    const session = await tx.formationSession.findFirst({
      where: { id: formationSessionId, parcoursId, deletedAt: null },
      select: { id: true },
    })
    if (!session) throw new Error('Session introuvable pour ce parcours.')
    return session.id
  }

  const existing = await tx.formationSession.findFirst({
    where: { parcoursId, deletedAt: null },
    orderBy: { ordre: 'asc' },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await tx.formationSession.create({
    data: { parcoursId, ordre: 1, titre: 'Session initiale' },
    select: { id: true },
  })
  return created.id
}

function sequencePrismaData(input: SequenceInput) {
  return {
    titre: input.titre,
    type: input.type,
    date: new Date(input.date),
    demiJournees: input.demiJournees,
    heures: input.heures,
    montantHT: input.montantHT ?? null,
    lieu: input.lieu ?? null,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    visioLink: input.visioLink ?? null,
    preuveType: input.preuveType,
    formateurId: input.formateurId ?? null,
  }
}

export async function addSequence(parcoursId: string, input: SequenceInput, formationSessionId?: string) {
  return db.$transaction(async (tx) => {
    const resolvedSessionId = await resolveFormationSessionId(parcoursId, tx, formationSessionId)
    // 🔴 `ordre` is no longer user-facing — séquences display in date order —
    // but it stays a real, unique-per-parcours column (convocation refs like
    // "REF-CONVOC-3" are built from it), so it's assigned automatically here.
    const { _max } = await tx.sequence.aggregate({ where: { parcoursId }, _max: { ordre: true } })
    const sequence = await tx.sequence.create({
      data: { parcoursId, formationSessionId: resolvedSessionId, ordre: (_max.ordre ?? 0) + 1, ...sequencePrismaData(input) },
    })
    await recomputeParcoursDerived(parcoursId, tx)
    await recomputeMontants(parcoursId, tx)
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
    await recomputeMontants(sequence.parcoursId, tx)
    return sequence
  })
}

export async function deleteSequence(sequenceId: string) {
  return db.$transaction(async (tx) => {
    const sequence = await tx.sequence.delete({ where: { id: sequenceId } })
    await recomputeParcoursDerived(sequence.parcoursId, tx)
    await recomputeMontants(sequence.parcoursId, tx)
    return sequence
  })
}
