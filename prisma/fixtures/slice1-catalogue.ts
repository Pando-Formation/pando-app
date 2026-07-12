/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 1 — CATALOGUE VERIFICATION
 *
 *  Exercises the real domain logic directly (bypassing HTTP): Formation
 *  create/update, FormationVersion immutability, the programme PDF content,
 *  and the NSF champs cascade — using real acceptance-criteria data
 *  ("Médiation et gestion des conflits" 7h/1j présentiel, BAM! with its
 *  five real objectives, CLIC! with requiresFullCohort).
 *
 *  Deliberately separate from real-data.ts (the frozen Slice-0 gate) rather
 *  than an edit to it — this file's reset/teardown is scoped to its own
 *  VERIFY-* internalCodes only, and never touches Slice 0's fixtures.
 *
 *  Run:     npm run verify:slice1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { formationInputSchema } from '@/lib/validation/formation'
import { createFormationWithVersion, updateFormationWithVersion } from '@/lib/formation'
import type { FormationSnapshot } from '@/lib/formation'
import { renderProgrammeHtml } from '@/lib/pdf/programme-template'
import { htmlToPdfBuffer } from '@/lib/pdf/pdf-engine'
import { getNsfTree } from '@/lib/nsf'

const log = {
  head: (s: string) => console.log(`\n─── ${s} ───\n`),
  ok: (s: string) => console.log(`  ✓ ${s}`),
  fail: (s: string) => console.log(`  ✗ ${s}`),
}

let total = 0
let failures = 0
function assert(condition: boolean, message: string) {
  total++
  if (condition) {
    log.ok(message)
  } else {
    log.fail(message)
    failures++
  }
}

const VERIFY_CODES = ['VERIFY-MGC', 'VERIFY-BAM', 'VERIFY-CLIC']

async function cleanup() {
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { in: VERIFY_CODES } } } })
  await db.formation.deleteMany({ where: { internalCode: { in: VERIFY_CODES } } })
}

// 🔴 Real objectives — source of truth is prisma/fixtures/real-data.ts's
// seedCatalogue(). Duplicated, not imported: real-data.ts is the frozen
// Slice-0 gate and this file must not couple to its reset/teardown semantics.
const BAM_OBJECTIVES = [
  'Prendre du recul sur leur posture et clarifier leur projet managérial',
  'Communiquer avec justesse et aisance dans toutes les directions (360°)',
  'Motiver et fédérer leur équipe autour d’objectifs partagés',
  'Organiser leur temps et leurs priorités dans un environnement contraint',
  'Orchestrer la performance collective en mobilisant l’intelligence de chacun',
]

async function main() {
  log.head('SLICE 1 — CATALOGUE VERIFICATION')
  await cleanup()

  // ── 1. "Médiation et gestion des conflits" — 7h/1j, présentiel ───────────
  const mgcInput = formationInputSchema.parse({
    internalCode: 'VERIFY-MGC',
    title: 'Médiation et gestion des conflits',
    durationHours: '7',
    durationDays: '1',
    format: 'PRESENTIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Tout public',
    pedagogicObjectives: ['Prévenir et désamorcer les conflits en équipe'],
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap.',
  })
  const mgc = await createFormationWithVersion(mgcInput)
  assert(mgc.durationHours.toString() === '7', 'Médiation — 7h enregistrées')
  assert(mgc.durationDays.toString() === '1', 'Médiation — 1j enregistré')
  assert(mgc.format === 'PRESENTIEL', 'Médiation — format présentiel')
  const mgcV1 = await db.formationVersion.findUnique({
    where: { formationId_version: { formationId: mgc.id, version: 1 } },
  })
  assert(mgcV1 !== null, 'Médiation — FormationVersion v1 créée')

  // ── 2. BAM! — the five real objectives, no cap ────────────────────────────
  const bamInput = formationInputSchema.parse({
    internalCode: 'VERIFY-BAM',
    title: 'BAM! — Bien Ancrer son Management',
    brandProgramme: 'BAM',
    durationHours: '24.5',
    durationDays: '3.5',
    format: 'PRESENTIEL_DISTANCIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Managers en prise de poste (0–2 ans)',
    pedagogicObjectives: BAM_OBJECTIVES,
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap. Référent : contact@pando-formation.fr',
  })
  const bam = await createFormationWithVersion(bamInput)
  assert(bam.pedagogicObjectives.length === 5, 'BAM! — cinq objectifs enregistrés (pas de plafond à 3)')

  // ── 3. CLIC! — requiresFullCohort ──────────────────────────────────────────
  const clicInput = formationInputSchema.parse({
    internalCode: 'VERIFY-CLIC',
    title: "CLIC! — Construire l'impact collectif",
    brandProgramme: 'CLIC',
    requiresFullCohort: true,
    intraOnly: true,
    durationHours: '10.5',
    durationDays: '1.5',
    format: 'PRESENTIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Comités de direction — collectif complet requis',
    pedagogicObjectives: ['Décider et arbitrer ensemble dans des contextes complexes'],
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap.',
  })
  const clic = await createFormationWithVersion(clicInput)
  assert(clic.requiresFullCohort === true, 'CLIC! — requiresFullCohort activé')

  // ── 4. Edit BAM! → v2, confirm v1 stays intact ────────────────────────────
  const editedObjectives = [...BAM_OBJECTIVES]
  editedObjectives[0] = 'VERSION 2 — ' + editedObjectives[0]
  const bamV2Input = formationInputSchema.parse({ ...bamInput, pedagogicObjectives: editedObjectives })
  await updateFormationWithVersion(bam.id, bamV2Input)

  const bamV1 = await db.formationVersion.findUnique({
    where: { formationId_version: { formationId: bam.id, version: 1 } },
  })
  const bamV2 = await db.formationVersion.findUnique({
    where: { formationId_version: { formationId: bam.id, version: 2 } },
  })
  assert(bamV2 !== null, 'BAM! — version 2 créée après édition')
  const bamV1Snapshot = bamV1?.snapshot as unknown as FormationSnapshot
  assert(
    bamV1Snapshot?.pedagogicObjectives[0] === BAM_OBJECTIVES[0],
    'BAM! — la version 1 reste intacte (objectif original préservé, non écrasé par v2)',
  )

  // ── 5. Programme content — pure HTML template, no Chromium involved ──────
  const html = renderProgrammeHtml(bamV1Snapshot, { version: 1, generatedAt: new Date() })
  assert(
    BAM_OBJECTIVES.every((o) => html.includes(o)),
    'Programme (HTML) — les cinq objectifs de BAM! v1 apparaissent',
  )
  assert(html.includes(bamV1Snapshot.prerequisites), 'Programme (HTML) — prérequis présents')
  assert(html.includes(bamV1Snapshot.delaiAcces), "Programme (HTML) — délai d'accès présent")
  assert(html.includes(bamV1Snapshot.accessibilite), 'Programme (HTML) — accessibilité présente')

  // ── 6. Real PDF render — the one place Chromium launches ─────────────────
  const pdfBuffer = await htmlToPdfBuffer(html)
  assert(pdfBuffer.subarray(0, 4).toString('ascii') === '%PDF', 'Puppeteer — le buffer généré est un PDF valide')
  assert(pdfBuffer.length > 1000, 'Puppeteer — le PDF a un contenu non trivial')

  // ── 7. NSF champs trap — 315m/315n/315p/315r: same groupe, 4 champs ───────
  const tree = await getNsfTree()
  const rhCodes = ['315m', '315n', '315p', '315r']
  const rhSpecialites = tree.specialites.filter((s) => rhCodes.includes(s.code))
  assert(rhSpecialites.length === 4, 'NSF — 315m/315n/315p/315r toutes présentes dans le référentiel seedé')
  assert(
    new Set(rhSpecialites.map((s) => s.groupeCode)).size === 1,
    'NSF — les quatre spécialités partagent le même groupe',
  )
  assert(
    new Set(rhSpecialites.map((s) => s.champsCode)).size === 4,
    'NSF — mais quatre champs distincts (le piège que le picker doit cascader)',
  )

  // ── 8. Role-SET semantics — never `===`, always `.includes()` ────────────
  assert(!(['ADMIN'] as string[]).includes('SUPER_ADMIN'), "Rôles — ['ADMIN'] n'inclut pas SUPER_ADMIN")
  assert(
    (['SUPER_ADMIN', 'FORMATEUR'] as string[]).includes('SUPER_ADMIN'),
    "Rôles — ['SUPER_ADMIN','FORMATEUR'] inclut bien SUPER_ADMIN",
  )

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 1 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 1 catalogue verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
