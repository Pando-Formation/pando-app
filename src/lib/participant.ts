import { db } from '@/lib/db'
import { recomputeMontants } from '@/lib/parcours'
import type {
  ParticipantInput,
  FinanceurInput,
  ContractualisationInput,
  FinancementInput,
  EnrollParticipantInput,
  ParcoursParticipantInput,
} from '@/lib/validation/participant'

export async function createParticipant(input: ParticipantInput) {
  return db.participant.create({ data: toParticipantData(input) })
}

export async function updateParticipant(id: string, input: ParticipantInput) {
  return db.participant.update({ where: { id }, data: toParticipantData(input) })
}

function toParticipantData(input: ParticipantInput) {
  return {
    civilite: input.civilite ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    fonction: input.fonction ?? null,
    situation: input.situation,
    clientId: input.clientId ?? null,
  }
}

export async function createFinanceur(input: FinanceurInput) {
  return db.financeur.create({
    data: {
      name: input.name,
      siret: input.siret || null,
      type: input.type || null,
      contactEmail: input.contactEmail || null,
    },
  })
}

/**
 * 🔴 RÉTRACTATION — 10 days, fixed by law. Not a UI-editable date: computed
 * from the moment the contractualisation is created, never left to a form
 * field a user could mistype or omit. See CHECK 9 (contract_individu_retractation).
 */
export function computeRetractationEndsAt(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 10)
  return d
}

/**
 * 🔴 Payment trigger for a self-funding individual = max(J-2, rétractation
 * end) — NEVER simply J-2. The legacy process doc's "paiement 48h avant" may
 * be unlawful for a PARTICULIER; this is why. Pure, so it's independently
 * testable and reusable wherever the trigger date needs to be displayed.
 */
export function computePaymentTriggerDate(parcoursDateDebut: Date, retractationEndsAt: Date): Date {
  const jMinus2 = new Date(parcoursDateDebut)
  jMinus2.setDate(jMinus2.getDate() - 2)
  return jMinus2 > retractationEndsAt ? jMinus2 : retractationEndsAt
}

function resolvePayerTarget(payerType: ContractualisationInput['payerType'], payerId: string) {
  switch (payerType) {
    case 'ORGANISATION':
    case 'DONNEUR_ORDRE':
      return { payerClientId: payerId, payerParticipantId: null, financeurId: null }
    case 'INDIVIDU':
      return { payerClientId: null, payerParticipantId: payerId, financeurId: null }
    case 'OPCO':
      return { payerClientId: null, payerParticipantId: null, financeurId: payerId }
  }
}

export async function createContractualisation(parcoursId: string, input: ContractualisationInput) {
  const target = resolvePayerTarget(input.payerType, input.payerId)
  const contract = await db.$transaction(async (tx) => {
    const created = await tx.contractualisation.create({
      data: {
        parcoursId,
        payerType: input.payerType,
        ...target,
        status: 'BROUILLON',
        delaiReglement: input.delaiReglement ?? null,
        numeroEngagement: input.numeroEngagement ?? null,
        codeService: input.codeService ?? null,
        // 🔴 CHECK 9 — computed, never entered by hand.
        retractationEndsAt: input.payerType === 'INDIVIDU' ? computeRetractationEndsAt() : null,
      },
    })
    // 🔴 montantHT is derived. For INTER it remains 0 until participants are
    // attached to this contractualisation; for INTRA it mirrors the parcours
    // sequence total immediately.
    await recomputeMontants(parcoursId, tx)
    return created
  })
  return contract
}

export async function updateContractualisation(id: string, input: ContractualisationInput) {
  const existing = await db.contractualisation.findUniqueOrThrow({ where: { id } })
  const target = resolvePayerTarget(input.payerType, input.payerId)

  return db.$transaction(async (tx) => {
    const updated = await tx.contractualisation.update({
      where: { id },
      data: {
        payerType: input.payerType,
        ...target,
        delaiReglement: input.delaiReglement ?? null,
        numeroEngagement: input.numeroEngagement ?? null,
        codeService: input.codeService ?? null,
        retractationEndsAt:
          input.payerType === 'INDIVIDU' ? (existing.retractationEndsAt ?? computeRetractationEndsAt()) : null,
      },
    })
    // No montant recompute here — editing payer/délai/etc. never changes the
    // price; it only ever moves when a séquence's price does (see lib/parcours.ts).
    return updated
  })
}

/// 🔴 A contractualisation is never hard-deleted — it can already carry real
/// documents (devis/factures/conventions) and enrolled participants, neither
/// of which cascade-delete from it. Cancelling freezes the contractualisation's
/// own montantHT as the historical deal amount, then recomputes the parcours
/// from the remaining non-cancelled deals.
export async function cancelContractualisation(id: string) {
  return db.$transaction(async (tx) => {
    const cancelled = await tx.contractualisation.update({ where: { id }, data: { status: 'ANNULEE' } })
    await recomputeMontants(cancelled.parcoursId, tx)
    return cancelled
  })
}

export async function addFinancement(contractualisationId: string, input: FinancementInput) {
  return db.financement.create({
    data: {
      contractualisationId,
      type: input.type,
      financeurId: input.financeurId ?? null,
      dossierNumber: input.dossierNumber ?? null,
      montantPrisEnCharge: input.montantPrisEnCharge,
    },
  })
}

export async function updateFinancement(id: string, input: FinancementInput) {
  return db.financement.update({
    where: { id },
    data: {
      type: input.type,
      financeurId: input.financeurId ?? null,
      dossierNumber: input.dossierNumber ?? null,
      montantPrisEnCharge: input.montantPrisEnCharge,
    },
  })
}

export async function deleteFinancement(id: string) {
  return db.financement.delete({ where: { id } })
}

export async function enrollParticipant(parcoursId: string, input: EnrollParticipantInput) {
  return db.$transaction(async (tx) => {
    const enrollment = await tx.parcoursParticipant.create({
      data: {
        parcoursId,
        participantId: input.participantId,
        contractualisationId: input.contractualisationId ?? null,
      },
    })
    if (input.contractualisationId) {
      await recomputeMontants(parcoursId, tx)
    }
    return enrollment
  })
}

export async function updateParcoursParticipant(id: string, input: ParcoursParticipantInput) {
  const existing = await db.parcoursParticipant.findUniqueOrThrow({ where: { id } })

  return db.parcoursParticipant.update({
    where: { id },
    data: {
      status: input.status,
      abandonReason: input.status === 'ABANDON' ? (input.abandonReason ?? null) : null,
      besoinAccessibilite: input.besoinAccessibilite ?? null,
      adaptationProposee: input.adaptationProposee ?? null,
      referentHandicapId: input.referentHandicapId ?? null,
      // 🔴 A declared need with no traced response is a non-conformity — the
      // timestamp is the proof the declaration was ANSWERED, set once, kept.
      adaptationTraceeAt: input.traceResponse ? (existing.adaptationTraceeAt ?? new Date()) : existing.adaptationTraceeAt,
    },
  })
}
