/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 5 — PARTICIPANTS & CONTRACTUALISATION VERIFICATION · THE PAYER AXIS
 *
 *  Exercises the real domain logic (src/lib/participant.ts) directly against
 *  the Slice 5 acceptance criteria: seven participants under four
 *  contractualisations with three funding origins on one parcours,
 *  Parcours.montantHT and every non-cancelled Contractualisation.montantHT
 *  derived from Σ the parcours's séquences (v1.6 — "the contract = all the
 *  séquences": every payer mirrors the same total, cancelling one never
 *  moves the parcours figure), the 10-day rétractation window computed —
 *  never entered — for a self-funding individual, the max(J-2, rétractation)
 *  payment trigger, and the accessibility chain (declared → référent →
 *  adaptation → traced).
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference/email prefixed VERIFY5-.
 *
 *  Run:     npm run verify:slice5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, addSequence } from '@/lib/parcours'
import {
  contractualisationInputSchema,
  financementInputSchema,
  enrollParticipantInputSchema,
  parcoursParticipantInputSchema,
  participantInputSchema,
} from '@/lib/validation/participant'
import {
  createParticipant,
  createFinanceur,
  createContractualisation,
  cancelContractualisation,
  addFinancement,
  enrollParticipant,
  updateParcoursParticipant,
  computeRetractationEndsAt,
  computePaymentTriggerDate,
} from '@/lib/participant'
import { createFormationWithVersion } from '@/lib/formation'

const log = {
  head: (s: string) => console.log(`\n─── ${s} ───\n`),
  ok: (s: string) => console.log(`  ✓ ${s}`),
  fail: (s: string) => console.log(`  ✗ ${s}`),
}

let total = 0
let failures = 0
function assert(condition: boolean, message: string) {
  total++
  if (condition) log.ok(message)
  else {
    log.fail(message)
    failures++
  }
}

const PREFIX = 'VERIFY5-'
const EMAIL_DOMAIN = '@verify-slice5.test'

async function cleanup() {
  await db.financement.deleteMany({ where: { contractualisation: { parcours: { reference: { startsWith: PREFIX } } } } })
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.contractualisation.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: PREFIX } } })
  await db.financeur.deleteMany({ where: { name: { startsWith: PREFIX } } })
}

async function main() {
  log.head('SLICE 5 — PARTICIPANTS & CONTRACTUALISATION VERIFICATION')
  await cleanup()

  // ── Setup: an inter parcours with a real dateDebut, for the payment trigger ─
  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY5 — Bien Ancrer son Management',
    subtitle: null,
    brandProgramme: null,
    requiresFullCohort: false,
    intraOnly: false,
    format: 'PRESENTIEL',
    durationHours: '24.5',
    durationDays: '3.5',
    prerequisites: 'Aucun',
    targetAudience: 'Managers',
    pedagogicObjectives: ['Objectif de test'],
    methodesPedagogiques: null,
    modalitesEvaluation: null,
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap.',
    priceIntraPerDay: null,
    priceInterPerPerson: null,
    bpfIncluded: true,
    prestationCode: null,
    specialiteId: null,
  })

  const parcours = await createParcours(
    parcoursInputSchema.parse({
      reference: `${PREFIX}F118`,
      formationId: formation.id,
      pandoRole: 'PRESTATAIRE_DIRECT',
      track: 'INTER',
      status: 'CONFIRME',
      delaiReglement: '30',
    }),
  )
  await addSequence(
    parcours.id,
    sequenceInputSchema.parse({
      ordre: '1',
      titre: 'Jour 1',
      type: 'PRESENTIEL',
      date: '2026-09-14',
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: '7',
      montantHT: 714_000, // 🔴 v1.6 — the contract = all the séquences: this IS the parcours's total now.
      preuveType: 'SIGNATURE',
    }),
  )

  // ── 1. Bordeaux Inter — 7 participants, 4 payers, 3 funding origins ──────
  const payers = [
    { name: `${PREFIX}Groupe Cassous`, seats: 4, fin: 'OPCO' as const },
    { name: `${PREFIX}Cabinet Mérignac`, seats: 1, fin: 'ENTREPRISE_DIRECTE' as const },
    { name: `${PREFIX}Bordeaux Métropole`, seats: 1, fin: 'AUTRE' as const },
    { name: `${PREFIX}Enedis Sud-Ouest`, seats: 1, fin: 'OPCO' as const },
  ]

  const contractIds: string[] = []
  let seat = 0
  for (const p of payers) {
    const client = await db.client.create({ data: { companyName: p.name, status: 'ACTIF' } })

    const contract = await createContractualisation(
      parcours.id,
      contractualisationInputSchema.parse({
        payerType: 'ORGANISATION',
        payerId: client.id,
        status: 'CONVENTION_SIGNEE',
        delaiReglement: '30',
      }),
    )
    contractIds.push(contract.id)

    await addFinancement(
      contract.id,
      financementInputSchema.parse({
        type: p.fin,
        montantPrisEnCharge: String(p.seats * 178_500),
      }),
    )

    for (let i = 0; i < p.seats; i++) {
      seat++
      const participant = await createParticipant(
        participantInputSchema.parse({
          firstName: `Participant${seat}`,
          lastName: p.name,
          email: `p${seat}${EMAIL_DOMAIN}`,
          situation: 'SALARIE',
          clientId: client.id,
        }),
      )
      await enrollParticipant(
        parcours.id,
        enrollParticipantInputSchema.parse({ participantId: participant.id, contractualisationId: contract.id }),
      )
    }
  }

  const reloaded = await db.parcours.findUniqueOrThrow({
    where: { id: parcours.id },
    include: { participants: true, contractualisations: { include: { financements: true } } },
  })
  assert(reloaded.participants.length === 7, 'Bordeaux Inter — 7 participants enrolled')
  assert(reloaded.contractualisations.length === 4, 'Bordeaux Inter — 4 contractualisations')
  assert(
    new Set(reloaded.contractualisations.flatMap((c) => c.financements.map((f) => f.type))).size === 3,
    'Bordeaux Inter — 3 distinct funding origins (OPCO, ENTREPRISE_DIRECTE, AUTRE) on one parcours',
  )

  // ── 2. Parcours.montantHT = Σ séquences, read-only ────────────────────────
  const SEQ_TOTAL = 714_000
  assert(
    reloaded.montantHT === SEQ_TOTAL,
    `Parcours.montantHT (${reloaded.montantHT}) = Σ séquences' montantHT (${SEQ_TOTAL}), derived from the séquences, not summed across payers`,
  )

  // ── 3. THE CONTRACT = ALL THE SÉQUENCES — every payer mirrors the SAME total,
  // whether they bought 4 seats (Groupe Cassous) or 1 (the other three).
  assert(
    reloaded.contractualisations.every((c) => c.montantHT === SEQ_TOTAL),
    'Every payer on this parcours shows the IDENTICAL séquence-derived montantHT — no more per-payer negotiated amount',
  )

  // ── 3b. Pricing a further séquence recomputes EVERY non-cancelled payer's
  // montantHT together, in lockstep with Parcours.montantHT ─────────────────
  await addSequence(
    parcours.id,
    sequenceInputSchema.parse({
      ordre: '2',
      titre: 'Jour 2',
      type: 'PRESENTIEL',
      date: '2026-09-15',
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: '7',
      montantHT: 178_500,
      preuveType: 'SIGNATURE',
    }),
  )
  const NEW_TOTAL = SEQ_TOTAL + 178_500
  const afterSecondSequence = await db.parcours.findUniqueOrThrow({
    where: { id: parcours.id },
    include: { contractualisations: true },
  })
  assert(afterSecondSequence.montantHT === NEW_TOTAL, 'Pricing a second séquence updates Parcours.montantHT to the new sum')
  assert(
    afterSecondSequence.contractualisations.every((c) => c.montantHT === NEW_TOTAL),
    'The same new total propagates to every non-cancelled contractualisation on the parcours',
  )

  // ── 3c. Cancelling a payer freezes ITS montantHT but never moves the
  // parcours total — it is the séquences' value, not a sum of active deals ──
  await cancelContractualisation(contractIds[0]!)
  const afterCancel = await db.parcours.findUniqueOrThrow({
    where: { id: parcours.id },
    include: { contractualisations: true },
  })
  assert(afterCancel.montantHT === NEW_TOTAL, 'Cancelling a contractualisation leaves Parcours.montantHT unaffected')
  const cancelled = afterCancel.contractualisations.find((c) => c.id === contractIds[0])!
  assert(cancelled.status === 'ANNULEE' && cancelled.montantHT === NEW_TOTAL, "The cancelled contractualisation's montantHT stays frozen at its last value")

  // ── 4. Intra has one contractualisation, inter has clientId = null ───────
  assert(reloaded.clientId === null, 'Inter parcours has NO client — payers live on Contractualisation')

  // ── 5. CHECK 8 — exactly one payer target, at the DB layer bypass ────────
  let dbRejectedTwoPayers = false
  try {
    await db.contractualisation.create({
      data: {
        parcoursId: parcours.id,
        payerType: 'ORGANISATION',
        payerClientId: (await db.client.findFirstOrThrow({ where: { companyName: { startsWith: PREFIX } } })).id,
        payerParticipantId: reloaded.participants[0]!.participantId, // TWO targets set — invalid
        status: 'BROUILLON',
      },
    })
  } catch {
    dbRejectedTwoPayers = true
  }
  assert(dbRejectedTwoPayers, 'A contractualisation with TWO payer targets reaching Prisma directly is rejected by CHECK 8')

  // ── 6. PARTICULIER payer — rétractation computed, never user input ───────
  const sarah = await createParticipant(
    participantInputSchema.parse({
      firstName: 'Sarah',
      lastName: 'Vidal',
      email: `sarah${EMAIL_DOMAIN}`,
      situation: 'PARTICULIER',
    }),
  )
  const before = new Date()
  const individuContract = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'INDIVIDU',
      payerId: sarah.id,
      status: 'BROUILLON',
    }),
  )
  assert(individuContract.retractationEndsAt !== null, 'INDIVIDU contractualisation gets a retractationEndsAt — never null')
  const expectedRetract = computeRetractationEndsAt(before)
  assert(
    Math.abs((individuContract.retractationEndsAt!.getTime() - expectedRetract.getTime())) < 5000,
    'retractationEndsAt = +10 days from creation, COMPUTED — there is no form field for it',
  )

  let dbRejectedNoRetractation = false
  try {
    await db.contractualisation.create({
      data: {
        parcoursId: parcours.id,
        payerType: 'INDIVIDU',
        payerParticipantId: sarah.id,
        status: 'BROUILLON',
        // no retractationEndsAt — bypasses the domain layer entirely
      },
    })
  } catch {
    dbRejectedNoRetractation = true
  }
  assert(dbRejectedNoRetractation, 'A PARTICULIER contractualisation with no rétractation window is rejected by CHECK 9, even bypassing the domain layer')

  // ── 7. Payment trigger = max(J-2, rétractation) — never simply J-2 ───────
  const parcoursStart = new Date('2026-09-14')
  const earlyRetractation = new Date('2026-08-01') // well before J-2 → J-2 wins
  const lateRetractation = new Date('2026-09-13') // after J-2 → rétractation wins
  const jMinus2 = new Date('2026-09-12')
  assert(
    computePaymentTriggerDate(parcoursStart, earlyRetractation).getTime() === jMinus2.getTime(),
    'Payment trigger — rétractation ends early: J-2 wins (2026-09-12)',
  )
  assert(
    computePaymentTriggerDate(parcoursStart, lateRetractation).getTime() === lateRetractation.getTime(),
    'Payment trigger — rétractation ends late: rétractation wins, NEVER simply J-2 (2026-09-13, not 2026-09-12)',
  )

  // ── 8. Accessibility chain — declared → référent → adaptation → traced ───
  const enrolledIds = reloaded.participants.map((p) => p.id)
  const ppNeedsResponse = enrolledIds[0]!
  const ppUntraced = enrolledIds[1]!

  await updateParcoursParticipant(
    ppNeedsResponse,
    parcoursParticipantInputSchema.parse({
      status: 'INSCRIT',
      besoinAccessibilite: 'Fauteuil roulant — accès salle',
      adaptationProposee: 'Salle réaménagée en rez-de-chaussée',
      traceResponse: true,
    }),
  )
  const traced = await db.parcoursParticipant.findUniqueOrThrow({ where: { id: ppNeedsResponse } })
  assert(traced.besoinAccessibilite !== null, 'Accessibility need recorded')
  assert(traced.adaptationTraceeAt !== null, 'Traced response sets adaptationTraceeAt — the proof the declaration was ANSWERED')

  await updateParcoursParticipant(
    ppUntraced,
    parcoursParticipantInputSchema.parse({
      status: 'INSCRIT',
      besoinAccessibilite: 'Interprète LSF requis',
      traceResponse: false,
    }),
  )
  const untraced = await db.parcoursParticipant.findUniqueOrThrow({ where: { id: ppUntraced } })
  assert(
    untraced.besoinAccessibilite !== null && untraced.adaptationTraceeAt === null,
    'A declared need with NO traced response stays untraced — this is what the UI must show in red',
  )

  // ── 9. CHECK 5 — an abandon requires a reason, at both layers ────────────
  const abandonRejected = parcoursParticipantInputSchema.safeParse({
    status: 'ABANDON',
    traceResponse: false,
    // no abandonReason
  })
  assert(!abandonRejected.success, 'An abandon with no reason is rejected by validation (CHECK 5)')

  let dbRejectedAbandon = false
  try {
    await db.parcoursParticipant.update({
      where: { id: enrolledIds[2]! },
      data: { status: 'ABANDON' }, // no abandonReason — bypasses zod
    })
  } catch {
    dbRejectedAbandon = true
  }
  assert(dbRejectedAbandon, 'An abandon with no reason reaching Prisma directly is rejected by the DB CHECK')

  // ── 10. OPCO payer resolves through Financeur, not Client ────────────────
  const financeur = await createFinanceur({ name: `${PREFIX}AKTO`, siret: null, type: 'OPCO', contactEmail: null })
  const opcoContract = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'OPCO',
      payerId: financeur.id,
      status: 'BROUILLON',
    }),
  )
  assert(opcoContract.financeurId === financeur.id && opcoContract.payerClientId === null, 'OPCO payer resolves to financeurId, not payerClientId')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 5 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 5 participants & contractualisation verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
