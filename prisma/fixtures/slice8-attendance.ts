/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 8 — ÉMARGEMENT VERIFICATION · THE HARD ONE (scoped down)
 *
 *  What's real: the state machine (src/lib/attendance.ts), CHECK 6/7
 *  enforcement at both the zod and DB layers, the derived hoursAttended
 *  (real hours, never contracted hours — missing one demi-journée reduces
 *  the total, it doesn't zero it), the formateur counter-signature, and the
 *  paper fallback path.
 *
 *  What's NOT built and NOT tested here: the offline PWA (service worker +
 *  IndexedDB queue + sync-on-reconnect). See the "demo scope" memory.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference prefixed VERIFY8-.
 *
 *  Run:     npm run verify:slice8
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { createFormationWithVersion } from '@/lib/formation'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, addSequence } from '@/lib/parcours'
import { participantInputSchema } from '@/lib/validation/participant'
import { createParticipant, enrollParticipant } from '@/lib/participant'
import { attendanceInputSchema } from '@/lib/validation/attendance'
import { markAttendance, counterSignAttendance } from '@/lib/attendance'

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

const PREFIX = 'VERIFY8-'
const EMAIL_DOMAIN = '@verify-slice8.test'

async function cleanup() {
  await db.attendance.deleteMany({ where: { sequence: { parcours: { reference: { startsWith: PREFIX } } } } })
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.document.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
}

async function main() {
  log.head('SLICE 8 — ÉMARGEMENT VERIFICATION')
  await cleanup()

  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY8 — Bien Ancrer son Management',
    subtitle: null,
    brandProgramme: null,
    requiresFullCohort: false,
    intraOnly: false,
    format: 'PRESENTIEL',
    durationHours: '14',
    durationDays: '2',
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

  // Two full days, 7h each (MATIN + APRES_MIDI), 14h total across 4 demi-journées → 3.5h each.
  const jour1 = await addSequence(
    parcours.id,
    sequenceInputSchema.parse({ ordre: '1', titre: 'Jour 1', type: 'PRESENTIEL', date: '2026-09-14', demiJournees: ['MATIN', 'APRES_MIDI'], heures: '7', preuveType: 'SIGNATURE' }),
  )
  const jour2 = await addSequence(
    parcours.id,
    sequenceInputSchema.parse({ ordre: '2', titre: 'Jour 2', type: 'PRESENTIEL', date: '2026-09-21', demiJournees: ['MATIN', 'APRES_MIDI'], heures: '7', preuveType: 'SIGNATURE' }),
  )

  const marie = await createParticipant(
    participantInputSchema.parse({ firstName: 'Marie', lastName: 'Test', email: `marie${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
  )
  await enrollParticipant(parcours.id, { participantId: marie.id, contractualisationId: null })

  // ── 1. CHECK 7 — PRESENT with no proof is rejected, at the DB layer ──────
  let dbRejectedNoProof = false
  try {
    await db.attendance.create({
      data: { sequenceId: jour1.id, participantId: marie.id, demiJournee: 'MATIN', status: 'PRESENT', preuveType: 'SIGNATURE' },
    })
  } catch {
    dbRejectedNoProof = true
  }
  assert(dbRejectedNoProof, '⭐ PRESENT with no signature/connection/completion/scan is rejected by the DB CHECK — a false audit trail is unwritable')

  // ── 2. CHECK 6 — an absence with no justification, at both layers ────────
  const absentRejected = attendanceInputSchema.safeParse({ status: 'ABSENT_JUSTIFIE' })
  assert(!absentRejected.success, 'An absence with no justification is rejected by validation')

  let dbRejectedNoJustification = false
  try {
    await db.attendance.create({
      data: { sequenceId: jour1.id, participantId: marie.id, demiJournee: 'APRES_MIDI', status: 'ABSENT_JUSTIFIE', preuveType: 'SIGNATURE' },
    })
  } catch {
    dbRejectedNoJustification = true
  }
  assert(dbRejectedNoJustification, 'An absence with no justification reaching Prisma directly is rejected by the DB CHECK')

  // ── 3. Real presence, via the domain layer, with real proof ──────────────
  await markAttendance(jour1.id, marie.id, 'MATIN', attendanceInputSchema.parse({ status: 'PRESENT', signatureName: 'Marie Test' }), '203.0.113.42')
  const j1matin = await db.attendance.findUniqueOrThrow({
    where: { sequenceId_participantId_demiJournee: { sequenceId: jour1.id, participantId: marie.id, demiJournee: 'MATIN' } },
  })
  assert(j1matin.signedAt !== null && j1matin.signedIp === '203.0.113.42', 'markAttendance records signedAt + the real request IP, not a placeholder')

  await markAttendance(jour1.id, marie.id, 'APRES_MIDI', attendanceInputSchema.parse({ status: 'PRESENT', signatureName: 'Marie Test' }), '203.0.113.42')
  await markAttendance(jour2.id, marie.id, 'MATIN', attendanceInputSchema.parse({ status: 'PRESENT', signatureName: 'Marie Test' }), '203.0.113.42')

  // ── 4. 🔴 Missing ONE demi-journée reduces real hours — never zeroes them, never the full total ─
  await markAttendance(
    jour2.id,
    marie.id,
    'APRES_MIDI',
    attendanceInputSchema.parse({ status: 'ABSENT_JUSTIFIE', justification: 'Rendez-vous médical' }),
    null,
  )
  const ppAfter = await db.parcoursParticipant.findUniqueOrThrow({
    where: { parcoursId_participantId: { parcoursId: parcours.id, participantId: marie.id } },
  })
  assert(
    Number(ppAfter.hoursAttended) === 10.5,
    `Marie attended 3 of 4 demi-journées (3.5h each) → 10.5h REAL hours, not 14h contracted — got ${ppAfter.hoursAttended}`,
  )

  // ── 5. Formateur counter-signature — separate act, invalidated on status change ─
  const signed = await counterSignAttendance(j1matin.id)
  assert(signed.formateurSignedAt !== null, 'The formateur counter-signs — a separate act from the participant signing')

  await markAttendance(jour1.id, marie.id, 'MATIN', attendanceInputSchema.parse({ status: 'ABSENT_NON_JUSTIFIE', justification: 'Correction de saisie' }), null)
  await markAttendance(jour1.id, marie.id, 'MATIN', attendanceInputSchema.parse({ status: 'PRESENT', signatureName: 'Marie Test' }), '203.0.113.42')
  const resigned = await db.attendance.findUniqueOrThrow({ where: { id: j1matin.id } })
  assert(resigned.formateurSignedAt === null, 'Any status change invalidates a prior counter-signature — it must be re-witnessed, not carried over silently')

  // ── 6. 🔴 Paper fallback — a dead router must never block a session ──────
  const paperSequence = await addSequence(
    parcours.id,
    sequenceInputSchema.parse({ ordre: '3', titre: 'Jour 3 (secteur sans réseau)', type: 'PRESENTIEL', date: '2026-09-28', demiJournees: ['MATIN'], heures: '3.5', preuveType: 'PAPER' }),
  )
  let paperRejectedWithoutScan = false
  try {
    await markAttendance(paperSequence.id, marie.id, 'MATIN', attendanceInputSchema.parse({ status: 'PRESENT' }), null)
  } catch {
    paperRejectedWithoutScan = true
  }
  assert(paperRejectedWithoutScan, 'Marking PRESENT via paper proof with no scanned document is rejected — the fallback is not a bypass')

  const scannedSheet = await db.document.create({
    data: {
      type: 'FEUILLE_EMARGEMENT',
      parcoursId: parcours.id,
      filename: 'feuille-scannee-jour3.pdf',
      storagePath: 'n/a-for-this-check',
      mimeType: 'application/pdf',
    },
  })
  const paperAttendance = await markAttendance(
    paperSequence.id,
    marie.id,
    'MATIN',
    attendanceInputSchema.parse({ status: 'PRESENT', documentId: scannedSheet.id }),
    null,
  )
  assert(paperAttendance.documentId === scannedSheet.id, 'With a scanned sheet attached, paper-fallback presence is recorded — the session is never blocked by a dead router')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 8 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 8 émargement verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
