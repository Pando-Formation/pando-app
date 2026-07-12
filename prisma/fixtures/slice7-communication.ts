/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 7 — SENDING & DELIVERY PROOF VERIFICATION
 *
 *  ⭐ THE TEST THAT MATTERS (from docs/V1_SLICES.md):
 *  Point a participant's email at a dead address. Send the convocation.
 *  The dashboard must show a red failure — NEVER a completed step.
 *
 *  Real sending is MOCKED — no Brevo account/webhook endpoint exists for
 *  local dev (see src/lib/communication.ts). simulateDelivery() plays the
 *  role a Brevo webhook would play. What this fixture actually verifies is
 *  the state machine and the badge-mapping rule: DELIVERED is the only
 *  green state, HARD_BOUNCE is always red, and nothing renders green from
 *  a bare SENT with no webhook confirmation.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference prefixed VERIFY7-.
 *
 *  Run:     npm run verify:slice7
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { createFormationWithVersion } from '@/lib/formation'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, addSequence } from '@/lib/parcours'
import { participantInputSchema } from '@/lib/validation/participant'
import { createParticipant, enrollParticipant } from '@/lib/participant'
import { sendConvocations, simulateDelivery } from '@/lib/communication'
import { deliveryStatusBadgeClass } from '@/lib/communication-labels'

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

const PREFIX = 'VERIFY7-'
const EMAIL_DOMAIN = '@verify-slice7.test'

async function cleanup() {
  await db.communicationMessage.deleteMany({ where: { recipientEmail: { endsWith: EMAIL_DOMAIN } } })
  await db.communicationSequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.communicationTemplate.deleteMany({ where: { name: 'Convocations (envoi manuel)', sequences: { none: {} } } })
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
}

async function main() {
  log.head('SLICE 7 — SENDING & DELIVERY PROOF VERIFICATION')
  await cleanup()

  // ── Setup — a parcours with eight participants, one at a dead address ────
  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY7 — Bien Ancrer son Management',
    subtitle: null,
    brandProgramme: null,
    requiresFullCohort: false,
    intraOnly: false,
    format: 'PRESENTIEL',
    durationHours: '7',
    durationDays: '1',
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
      reference: `${PREFIX}F1`,
      formationId: formation.id,
      pandoRole: 'PRESTATAIRE_DIRECT',
      track: 'INTER',
      status: 'CONFIRME',
      delaiReglement: '30',
    }),
  )
  const sequence = await addSequence(
    parcours.id,
    sequenceInputSchema.parse({
      ordre: '1',
      titre: 'Jour 1',
      type: 'PRESENTIEL',
      date: '2026-09-14',
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: '7',
      preuveType: 'SIGNATURE',
    }),
  )

  const deadAddressParticipant = await createParticipant(
    participantInputSchema.parse({
      firstName: 'Dead',
      lastName: 'Address',
      email: `bounces-for-sure${EMAIL_DOMAIN}`,
      situation: 'SALARIE',
    }),
  )
  await enrollParticipant(parcours.id, { participantId: deadAddressParticipant.id, contractualisationId: null })

  for (let i = 1; i <= 7; i++) {
    const p = await createParticipant(
      participantInputSchema.parse({ firstName: `Good${i}`, lastName: 'Address', email: `good${i}${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
    )
    await enrollParticipant(parcours.id, { participantId: p.id, contractualisationId: null })
  }

  // ── 1. Alexandra clicks "Envoyer les convocations" — 8 go out ────────────
  const sent = await sendConvocations(sequence.id)
  assert(sent.length === 8, 'Eight convocations go out — one CommunicationMessage per enrolled participant')
  assert(sent.every((m) => m.deliveryStatus === 'SENT'), 'Every message starts SENT — dispatch is not delivery')

  const ppAfterSend = await db.parcoursParticipant.findMany({ where: { parcoursId: parcours.id } })
  assert(ppAfterSend.every((pp) => pp.convocationStatus === 'SENT'), "Each participant's convocationStatus mirrors the send")

  // ── 2. ⭐ THE TEST THAT MATTERS — the dead address hard-bounces ──────────
  const deadMessage = sent.find((m) => m.recipientEmail === deadAddressParticipant.email)!
  const bounced = await simulateDelivery(deadMessage.id, 'HARD_BOUNCE')
  assert(bounced.deliveryStatus === 'HARD_BOUNCE', 'The dead address hard-bounces')
  assert(
    deliveryStatusBadgeClass(bounced.deliveryStatus) === 'badge-danger',
    '🔴 A HARD_BOUNCE renders RED (badge-danger) — it must NEVER show a green tick',
  )
  assert(deliveryStatusBadgeClass(bounced.deliveryStatus) !== 'badge-success', 'A hard-bounced message is never mapped to the green/success badge class')

  // ── 3. The seven good addresses deliver — this IS the proof, nothing else is ─
  const goodMessages = sent.filter((m) => m.id !== deadMessage.id)
  for (const m of goodMessages) {
    await simulateDelivery(m.id, 'DELIVERED')
  }
  const delivered = await db.communicationMessage.findMany({ where: { id: { in: goodMessages.map((m) => m.id) } } })
  assert(
    delivered.every((m) => m.deliveryStatus === 'DELIVERED' && m.deliveredAt !== null),
    'The seven good addresses are DELIVERED, with a deliveredAt timestamp — the audit trail shows delivery time, not send time',
  )
  assert(
    delivered.every((m) => deliveryStatusBadgeClass(m.deliveryStatus) === 'badge-success'),
    'DELIVERED — and only DELIVERED/OPENED — renders green',
  )

  // ── 4. A plain SENT with no webhook confirmation is amber, NOT green ─────
  const freshSequence = await addSequence(
    parcours.id,
    sequenceInputSchema.parse({
      ordre: '2',
      titre: 'Jour 2',
      type: 'PRESENTIEL',
      date: '2026-09-21',
      demiJournees: ['MATIN'],
      heures: '3.5',
      preuveType: 'SIGNATURE',
    }),
  )
  const freshSent = await sendConvocations(freshSequence.id)
  assert(
    freshSent.every((m) => deliveryStatusBadgeClass(m.deliveryStatus) === 'badge-warning'),
    'A SENT message with no webhook yet is amber ("unconfirmed") — not green, not red',
  )

  // ── 5. Soft bounce → retry ×2 → THEN escalate to HARD_BOUNCE ─────────────
  const softTarget = freshSent[0]!
  const attempt1 = await simulateDelivery(softTarget.id, 'SOFT_BOUNCE')
  assert(attempt1.deliveryStatus === 'SOFT_BOUNCE' && attempt1.retryCount === 1, 'First soft bounce — retryCount 1, still SOFT_BOUNCE')
  const attempt2 = await simulateDelivery(softTarget.id, 'SOFT_BOUNCE')
  assert(attempt2.deliveryStatus === 'SOFT_BOUNCE' && attempt2.retryCount === 2, 'Second soft bounce — retryCount 2, still SOFT_BOUNCE (2 retries per docs)')
  const attempt3 = await simulateDelivery(softTarget.id, 'SOFT_BOUNCE')
  assert(attempt3.deliveryStatus === 'HARD_BOUNCE', 'Third failure escalates to HARD_BOUNCE — never lingers as an unresolved soft bounce forever')
  assert(deliveryStatusBadgeClass(attempt3.deliveryStatus) === 'badge-danger', 'The escalated bounce renders red, same as a direct hard bounce')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 7 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 7 sending & delivery proof verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
