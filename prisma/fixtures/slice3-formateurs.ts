/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 3 — FORMATEURS VERIFICATION
 *
 *  Exercises the real domain logic directly against the Slice 3 acceptance
 *  criteria: the phantom-convention CHECK (both at validation and DB level),
 *  the true-cost formula for internal vs external formateurs (already the
 *  Slice-0-verified formateurDayCost, re-asserted here against the exact
 *  Sophie/Anthony/Alexandra numbers), and the certification-expiry warning
 *  window.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to emails
 *  under @verify-slice3.test.
 *
 *  Run:     npm run verify:slice3
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { formateurInputSchema, competenceInputSchema } from '@/lib/validation/formateur'
import { createFormateur, addCompetence, competenceStatus } from '@/lib/formateur'
import { formateurDayCost } from '@/lib/money'

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

const DOMAIN = '@verify-slice3.test'

async function cleanup() {
  await db.formateurCompetence.deleteMany({ where: { formateur: { email: { endsWith: DOMAIN } } } })
  await db.formateur.deleteMany({ where: { email: { endsWith: DOMAIN } } })
}

async function main() {
  log.head('SLICE 3 — FORMATEURS VERIFICATION')
  await cleanup()

  // ── 1. Phantom convention — CHECK 1, at the validation layer ─────────────
  const phantomInput = formateurInputSchema.safeParse({
    firstName: 'Phantom',
    lastName: 'Interne',
    email: `phantom${DOMAIN}`,
    contractType: 'INTERNE_DIRIGEANT',
    siren: '909625113', // the client's SIREN, exactly the live-sheet corruption
    tvaRate: '0',
    forfaitDeplacement: '0',
  })
  assert(!phantomInput.success, 'An internal formateur with a SIREN is rejected by validation')
  assert(
    Boolean(phantomInput.success === false && phantomInput.error.flatten().fieldErrors.siren?.[0]),
    'The rejection carries a human-readable message, not a bare constraint name',
  )

  // ── 2. Phantom convention — CHECK 1, at the DB layer (bypass safety net) ──
  let dbRejectedPhantom = false
  try {
    await db.formateur.create({
      data: {
        firstName: 'Phantom',
        lastName: 'Bypass',
        email: `phantom-bypass${DOMAIN}`,
        contractType: 'INTERNE_DIRIGEANT',
        siren: '909625113',
      },
    })
  } catch {
    dbRejectedPhantom = true
  }
  assert(dbRejectedPhantom, 'A phantom convention reaching Prisma directly is still rejected by the DB CHECK constraint')

  // ── 3. Alexandra — INTERNE_DIRIGEANT, cost = 0 ────────────────────────────
  const alexandra = await createFormateur(
    formateurInputSchema.parse({
      firstName: 'Alexandra',
      lastName: 'Verify',
      email: `alexandra${DOMAIN}`,
      contractType: 'INTERNE_DIRIGEANT',
      tvaRate: '0',
      tarifJour: '70000',
      forfaitDeplacement: '0',
    }),
  )
  assert(alexandra.siren === null && alexandra.nda === null, 'Alexandra — SIREN and NDA are unwritable, confirmed null')
  const alexandraCost = formateurDayCost({
    contractType: alexandra.contractType,
    tarifJour: alexandra.tarifJour,
    tvaRate: Number(alexandra.tvaRate),
    forfaitDeplacement: alexandra.forfaitDeplacement,
  })
  assert(alexandraCost === 0, 'Alexandra (internal) — true cost is 0€/day, not her 700€ notional day rate')

  // ── 4. Sophie — EXTERNE_PRESTATAIRE, 0% VAT → 720€/day ────────────────────
  const sophie = await createFormateur(
    formateurInputSchema.parse({
      firstName: 'Sophie',
      lastName: 'Verify',
      email: `sophie${DOMAIN}`,
      contractType: 'EXTERNE_PRESTATAIRE',
      siren: '931001093',
      tvaRate: '0',
      tarifJour: '70000', // 700€
      forfaitDeplacement: '2000', // 20€
    }),
  )
  const sophieCost = formateurDayCost({
    contractType: sophie.contractType,
    tarifJour: sophie.tarifJour,
    tvaRate: Number(sophie.tvaRate),
    forfaitDeplacement: sophie.forfaitDeplacement,
  })
  assert(sophieCost === 72_000, 'Sophie (0% VAT) — 700€ + 20€ travel = 720€/day exactly')

  // ── 5. Anthony — EXTERNE_PRESTATAIRE, 20% VAT → 860€/day, NOT 720€ ────────
  const anthony = await createFormateur(
    formateurInputSchema.parse({
      firstName: 'Anthony',
      lastName: 'Verify',
      email: `anthony${DOMAIN}`,
      contractType: 'EXTERNE_PRESTATAIRE',
      siren: '812345678',
      tvaRate: '0.20',
      tarifJour: '70000', // 700€
      forfaitDeplacement: '2000', // 20€
    }),
  )
  const anthonyCost = formateurDayCost({
    contractType: anthony.contractType,
    tarifJour: anthony.tarifJour,
    tvaRate: Number(anthony.tvaRate),
    forfaitDeplacement: anthony.forfaitDeplacement,
  })
  assert(anthonyCost === 86_000, "Anthony (20% VAT, absorbed) — 860€/day, NOT 720€ — the VAT is absorbed, not a pass-through")
  assert(anthonyCost !== sophieCost, "Anthony's cost is NOT equal to Sophie's despite an identical day rate — VAT status matters")

  // ── 6. Certification expiry — <60 days raises a warning ──────────────────
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)
  const far = new Date()
  far.setDate(far.getDate() + 200)
  const past = new Date()
  past.setDate(past.getDate() - 5)

  const compSoon = await addCompetence(
    anthony.id,
    competenceInputSchema.parse({ type: 'CERTIFICATION', title: 'Coaching', date: '2024-01-01', expiresAt: soon.toISOString() }),
  )
  const compFar = await addCompetence(
    anthony.id,
    competenceInputSchema.parse({ type: 'CERTIFICATION', title: 'Coaching renouvelée', date: '2024-01-01', expiresAt: far.toISOString() }),
  )
  const compPast = await addCompetence(
    anthony.id,
    competenceInputSchema.parse({ type: 'CERTIFICATION', title: 'Coaching expirée', date: '2020-01-01', expiresAt: past.toISOString() }),
  )
  const compNone = await addCompetence(
    anthony.id,
    competenceInputSchema.parse({ type: 'CV', title: 'CV', date: '2024-01-01' }),
  )

  assert(competenceStatus(compSoon.expiresAt) === 'expiring_soon', 'A certification expiring in 30 days → expiring_soon warning')
  assert(competenceStatus(compFar.expiresAt) === 'ok', 'A certification expiring in 200 days → ok, no warning')
  assert(competenceStatus(compPast.expiresAt) === 'expired', 'A certification that already lapsed → expired')
  assert(competenceStatus(compNone.expiresAt) === null, 'A CV with no expiry date → no status, not a crash')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 3 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 3 formateurs verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
