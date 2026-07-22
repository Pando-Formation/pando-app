/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 4 — PARCOURS & SÉQUENCES VERIFICATION · THE SPINE
 *
 *  Exercises the real domain logic (src/lib/parcours.ts) directly against the
 *  Slice 4 acceptance criteria: BAM!'s 9 séquences / 4 modalities, OPTA'S's
 *  sous-traitance coherence (CHECK 4, both layers), CLIC!'s full-cohort rule
 *  and its three lone demi-journées, and the fact that dateDebut / dateFin /
 *  totalHours are DERIVED — there is no input path that writes them directly,
 *  and editing the source Formation must never reach back into an existing
 *  parcours.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference/internalCode prefixed VERIFY4-.
 *
 *  Run:     npm run verify:slice4
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, updateParcours, addSequence, updateSequence, deleteSequence } from '@/lib/parcours'
import { createFormationWithVersion, updateFormationWithVersion } from '@/lib/formation'

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

const PREFIX = 'VERIFY4-'

async function cleanup() {
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: PREFIX } } })
}

const baseFormationInput = {
  subtitle: null,
  brandProgramme: null,
  requiresFullCohort: false,
  intraOnly: false,
  format: 'PRESENTIEL' as const,
  prerequisites: 'Aucun',
  targetAudience: 'Managers',
  methodesPedagogiques: null,
  modalitesEvaluation: null,
  delaiAcces: '15 jours ouvrés',
  accessibilite: 'Accessible aux personnes en situation de handicap.',
  priceIntraPerDay: null,
  priceInterPerPerson: null,
  bpfIncluded: true,
  prestationCode: null,
  specialiteId: null,
}

async function main() {
  log.head('SLICE 4 — PARCOURS & SÉQUENCES VERIFICATION')
  await cleanup()

  // ── Setup: two formations — one ordinary, one requiresFullCohort ─────────
  const bamFormation = await createFormationWithVersion({
    ...baseFormationInput,
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY4 — Bien Ancrer son Management',
    durationHours: '24.5',
    durationDays: '3.5',
    pedagogicObjectives: ['Prendre du recul sur sa posture managériale'],
  })

  const clicFormation = await createFormationWithVersion({
    ...baseFormationInput,
    internalCode: `${PREFIX}CLIC`,
    title: "VERIFY4 — Construire l'impact collectif",
    requiresFullCohort: true,
    intraOnly: true,
    durationHours: '10.5',
    durationDays: '1.5',
    pedagogicObjectives: ['Décider et arbitrer ensemble'],
  })

  const optasClient = await db.client.create({ data: { companyName: `${PREFIX}OPTAS`, status: 'ACTIF' } })

  // ── 1. BAM! — 9 séquences, 4 modalités, totalHours computes itself ───────
  const bam = await createParcours(
    parcoursInputSchema.parse({
      reference: `${PREFIX}F118`,
      formationId: bamFormation.id,
      pandoRole: 'PRESTATAIRE_DIRECT',
      track: 'INTER',
      status: 'CONFIRME',
      minParticipants: '6',
      maxParticipants: '10',
      delaiReglement: '30',
    }),
  )

  const bamSeqs = [
    { t: 'Kick-off + capsule de positionnement', y: 'ELEARNING', p: 'COMPLETION', dj: ['MATIN'], h: '0.5', d: '2026-09-07' },
    { t: 'Jour 1 — Construire son identité managériale', y: 'PRESENTIEL', p: 'SIGNATURE', dj: ['MATIN', 'APRES_MIDI'], h: '7', d: '2026-09-14' },
    { t: 'Défi 1 — Donner et recevoir de la reconnaissance', y: 'DEFI', p: 'COMPLETION', dj: ['MATIN'], h: '0.5', d: '2026-09-18' },
    { t: 'Étude de cas en collectif', y: 'TRAVAIL_AUTONOME', p: 'COMPLETION', dj: ['MATIN'], h: '0.5', d: '2026-09-24' },
    { t: "Jour 2 — Structurer l'organisation de son équipe", y: 'PRESENTIEL', p: 'SIGNATURE', dj: ['MATIN', 'APRES_MIDI'], h: '7', d: '2026-10-05' },
    { t: 'Flash coaching individuel', y: 'COACHING', p: 'COMPTE_RENDU', dj: ['APRES_MIDI'], h: '1', d: '2026-10-13' },
    { t: 'Jour 3 — Orchestrer la performance', y: 'PRESENTIEL', p: 'SIGNATURE', dj: ['MATIN', 'APRES_MIDI'], h: '7', d: '2026-10-20' },
    { t: 'Indicateurs clés — collectif autonome', y: 'TRAVAIL_AUTONOME', p: 'COMPLETION', dj: ['MATIN'], h: '0.5', d: '2026-10-28' },
    { t: "Retour d'expérience en visio", y: 'DISTANCIEL', p: 'CONNEXION', dj: ['APRES_MIDI'], h: '2.5', d: '2026-11-09' },
  ] as const

  for (const [i, s] of bamSeqs.entries()) {
    await addSequence(
      bam.id,
      sequenceInputSchema.parse({
        ordre: String(i + 1),
        titre: s.t,
        type: s.y,
        date: s.d,
        demiJournees: [...s.dj],
        heures: s.h,
        preuveType: s.p,
      }),
    )
  }

  const bamReloaded = await db.parcours.findUniqueOrThrow({ where: { id: bam.id }, include: { sequences: true } })
  assert(bamReloaded.sequences.length === 9, 'BAM! — 9 séquences created')
  assert(
    new Set(bamReloaded.sequences.map((s) => s.type)).size === 6,
    'BAM! — spans multiple modalities (présentiel, distanciel, e-learning, coaching, travail autonome, défi)',
  )
  assert(bamReloaded.totalHours.toString() === '26.5', 'BAM! — totalHours computes itself: 26.5h, never entered by hand')
  assert(
    bamReloaded.dateDebut?.toISOString().slice(0, 10) === '2026-09-07',
    'BAM! — dateDebut = MIN(sequences.date), derived',
  )
  assert(
    bamReloaded.dateFin?.toISOString().slice(0, 10) === '2026-11-09',
    'BAM! — dateFin = MAX(sequences.date), derived',
  )

  // ── 2. OPTA'S — sous-traitance coherence, CHECK 4 at both layers ─────────
  const optasNoOrdre = parcoursInputSchema.safeParse({
    reference: `${PREFIX}F103`,
    formationId: bamFormation.id,
    pandoRole: 'SOUS_TRAITANT',
    track: 'INTRA',
    status: 'CONFIRME',
    delaiReglement: '30',
    // no donneurOrdreId
  })
  assert(!optasNoOrdre.success, "Sous-traitance without a donneur d'ordre is rejected by validation (CHECK 4)")

  const bamVersion = await db.formationVersion.findFirstOrThrow({ where: { formationId: bamFormation.id } })
  let dbRejectedOptas = false
  try {
    await db.parcours.create({
      data: {
        reference: `${PREFIX}F103-BYPASS`,
        formationVersionId: bamVersion.id,
        pandoRole: 'SOUS_TRAITANT',
        track: 'INTRA',
        // no donneurOrdreId — bypasses zod entirely
      },
    })
  } catch {
    dbRejectedOptas = true
  }
  assert(dbRejectedOptas, "Sous-traitance without a donneur d'ordre reaching Prisma directly is still rejected by the DB CHECK")

  const optas = await createParcours(
    parcoursInputSchema.parse({
      reference: `${PREFIX}F103`,
      formationId: bamFormation.id,
      pandoRole: 'SOUS_TRAITANT',
      track: 'INTRA',
      status: 'CONFIRME',
      donneurOrdreId: optasClient.id,
      delaiReglement: '30',
    }),
  )

  const optasDates = ['2026-06-16', '2026-09-15', '2026-11-10', '2026-12-08', '2027-02-09', '2027-03-18']
  for (const [i, d] of optasDates.entries()) {
    await addSequence(
      optas.id,
      sequenceInputSchema.parse({
        ordre: String(i + 1),
        titre: `Session ${i + 1}`,
        type: 'PRESENTIEL',
        date: d,
        demiJournees: ['MATIN', 'APRES_MIDI'],
        heures: '14',
        preuveType: 'SIGNATURE',
      }),
    )
  }

  const optasReloaded = await db.parcours.findUniqueOrThrow({ where: { id: optas.id }, include: { sequences: true } })
  assert(optasReloaded.sequences.length === 6, "OPTA'S — 6 séquences created")
  assert(
    optasReloaded.dateDebut?.toISOString().slice(0, 10) === '2026-06-16' &&
      optasReloaded.dateFin?.toISOString().slice(0, 10) === '2027-03-18',
    "OPTA'S — spans 2026-06-16 → 2027-03-18, nine months expressed by Sequence[], not a flat startDate/endDate",
  )
  assert(optasReloaded.donneurOrdreId === optasClient.id, "OPTA'S — donneurOrdreId persisted")

  // ── 3. CLIC! — requiresFullCohort forces min = max ───────────────────────
  let fullCohortRejected = false
  try {
    await createParcours(
      parcoursInputSchema.parse({
        reference: `${PREFIX}F121-BAD`,
        formationId: clicFormation.id,
        pandoRole: 'PRESTATAIRE_DIRECT',
        track: 'INTRA',
        status: 'CONFIRME',
        minParticipants: '5',
        maxParticipants: '7', // mismatched — should be rejected
        delaiReglement: '30',
      }),
    )
  } catch {
    fullCohortRejected = true
  }
  assert(fullCohortRejected, 'CLIC! — a full-cohort programme with min ≠ max is rejected (application-layer rule §D)')

  const clic = await createParcours(
    parcoursInputSchema.parse({
      reference: `${PREFIX}F121`,
      formationId: clicFormation.id,
      pandoRole: 'PRESTATAIRE_DIRECT',
      track: 'INTRA',
      status: 'CONFIRME',
      minParticipants: '7',
      maxParticipants: '7',
      delaiReglement: '30',
    }),
  )

  const clicDjs = [
    { t: 'DJ1 — Sommes-nous réellement une équipe de direction ?', d: '2026-10-06' },
    { t: 'DJ2 — Pouvons-nous débattre et décider ensemble ?', d: '2026-11-10' },
    { t: 'DJ3 — Aligner vision, décisions et actions', d: '2026-12-01' },
  ]
  for (const [i, dj] of clicDjs.entries()) {
    await addSequence(
      clic.id,
      sequenceInputSchema.parse({
        ordre: String(i + 1),
        titre: dj.t,
        type: 'PRESENTIEL',
        date: dj.d,
        demiJournees: ['MATIN'], // 🔴 ONE demi-journée
        heures: '3.5',
        preuveType: 'SIGNATURE',
      }),
    )
  }

  const clicReloaded = await db.parcours.findUniqueOrThrow({ where: { id: clic.id }, include: { sequences: true } })
  assert(clicReloaded.sequences.length === 3, 'CLIC! — 3 séquences created')
  assert(
    clicReloaded.sequences.every((s) => s.demiJournees.length === 1),
    'CLIC! — each séquence is exactly ONE demi-journée — proves the unit is not over-engineering',
  )
  assert(clicReloaded.totalHours.toString() === '10.5', 'CLIC! — totalHours = 3 × 3.5h = 10.5h, derived')

  let dbRejectedEmptyDj = false
  const clicFormationSession = await db.formationSession.findFirstOrThrow({
    where: { parcoursId: clic.id, deletedAt: null },
    orderBy: { ordre: 'asc' },
  })
  try {
    await db.sequence.create({
      data: {
        parcoursId: clic.id,
        formationSessionId: clicFormationSession.id,
        ordre: 99,
        titre: 'No demi-journée',
        type: 'PRESENTIEL',
        date: new Date('2026-12-15'),
        demiJournees: [],
        heures: 3.5,
        preuveType: 'SIGNATURE',
      },
    })
  } catch {
    dbRejectedEmptyDj = true
  }
  assert(dbRejectedEmptyDj, 'A séquence with zero demi-journées reaching Prisma directly is rejected by the DB CHECK')

  // ── 4. Derived fields are read-only — no input path writes them ──────────
  // A malicious client payload including these fields is silently stripped —
  // neither parcoursInputSchema nor updateParcours ever reads them, so the
  // derived truth survives untouched.
  const maliciousPayload: Record<string, unknown> = {
    reference: bamReloaded.reference,
    formationId: bamFormation.id,
    pandoRole: bamReloaded.pandoRole,
    track: bamReloaded.track,
    status: bamReloaded.status,
    minParticipants: '6',
    maxParticipants: '10',
    delaiReglement: '30',
    dateDebut: '1999-01-01',
    totalHours: '999',
    montantHT: '999999',
  }
  await updateParcours(bam.id, parcoursInputSchema.parse(maliciousPayload))
  const bamAfterUpdate = await db.parcours.findUniqueOrThrow({ where: { id: bam.id } })
  assert(
    bamAfterUpdate.totalHours.toString() === '26.5' &&
      bamAfterUpdate.dateDebut?.toISOString().slice(0, 10) === '2026-09-07',
    'Injected dateDebut/totalHours in the update payload had zero effect — still 26.5h from 2026-09-07',
  )

  // ── 5. Sequence edit and delete recompute the derived totals ─────────────
  const seqToEdit = bamReloaded.sequences[0]!
  await updateSequence(seqToEdit.id, sequenceInputSchema.parse({ ...seqToEditInput(seqToEdit), heures: '1' }))
  const afterEdit = await db.parcours.findUniqueOrThrow({ where: { id: bam.id } })
  assert(afterEdit.totalHours.toString() === '27', 'Editing a séquence recomputes totalHours: 26.5 − 0.5 + 1 = 27')

  const seqToDelete = bamReloaded.sequences[bamReloaded.sequences.length - 1]!
  await deleteSequence(seqToDelete.id)
  const afterDelete = await db.parcours.findUniqueOrThrow({
    where: { id: bam.id },
    include: { sequences: true },
  })
  assert(afterDelete.sequences.length === 8, 'Removing a séquence leaves 8')
  assert(
    afterDelete.dateFin?.toISOString().slice(0, 10) === '2026-10-28',
    'Removing the last séquence recomputes dateFin back to the new latest date',
  )

  // ── 6. Editing the source Formation does NOT change an existing parcours ─
  await updateFormationWithVersion(bamFormation.id, {
    ...baseFormationInput,
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY4 — Bien Ancrer son Management (v2, retitled)',
    durationHours: '30',
    durationDays: '4',
    pedagogicObjectives: ['Un tout autre objectif, ajouté après coup'],
  })
  const bamParcoursAfterFormationEdit = await db.parcours.findUniqueOrThrow({
    where: { id: bam.id },
    include: { formationVersion: true },
  })
  assert(
    bamParcoursAfterFormationEdit.formationVersion.version === 1,
    'The parcours still points at FormationVersion v1 after the Formation was edited to v2',
  )
  const snapshotTitle = (bamParcoursAfterFormationEdit.formationVersion.snapshot as { title: string }).title
  assert(
    snapshotTitle === 'VERIFY4 — Bien Ancrer son Management',
    "The frozen snapshot still reads the ORIGINAL title, not '(v2, retitled)' — the parcours is immune to catalogue edits",
  )

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 4 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 4 parcours & séquences verification passed.\n')
}

function seqToEditInput(s: { ordre: number; titre: string; type: string; date: Date; demiJournees: string[]; heures: unknown; lieu: string | null; preuveType: string; formateurId: string | null }) {
  return {
    ordre: String(s.ordre),
    titre: s.titre,
    type: s.type,
    date: s.date.toISOString().slice(0, 10),
    demiJournees: s.demiJournees,
    heures: String(s.heures),
    lieu: s.lieu,
    preuveType: s.preuveType,
    formateurId: s.formateurId,
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
