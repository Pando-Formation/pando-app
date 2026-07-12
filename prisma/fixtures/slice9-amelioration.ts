/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 9 — AMÉLIORATION CONTINUE VERIFICATION
 *
 *  Exercises the real domain logic (src/lib/amelioration.ts) against the
 *  Slice 9 acceptance criteria: a réclamation intake → response → closure
 *  loop, an action that requires a NAMED owner + due date + a concrete
 *  outcome ("actioned" is not one), overdue actions surfacing correctly,
 *  and a veille entry that records what changed at PANDO, not just a link.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  email prefixed verify-slice9.
 *
 *  Run:     npm run verify:slice9
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { actionInputSchema, actionOutcomeInputSchema, reclamationInputSchema } from '@/lib/validation/amelioration'
import {
  createReclamation,
  respondToReclamation,
  createAction,
  resolveAction,
  createVeille,
  findOverdueActions,
} from '@/lib/amelioration'

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

const EMAIL = 'owner@verify-slice9.test'

async function cleanup() {
  const owner = await db.user.findUnique({ where: { email: EMAIL } })
  if (owner) {
    await db.actionAmelioration.deleteMany({ where: { ownerId: owner.id } })
    await db.veille.deleteMany({ where: { authorId: owner.id } })
    await db.user.delete({ where: { id: owner.id } })
  }
  await db.reclamation.deleteMany({ where: { description: { startsWith: 'VERIFY9-' } } })
}

async function main() {
  log.head('SLICE 9 — AMÉLIORATION CONTINUE VERIFICATION')
  await cleanup()

  const owner = await db.user.create({
    data: { email: EMAIL, name: 'Verify Owner', roles: ['SUPER_ADMIN'], authMethod: 'MAGIC_LINK' },
  })

  // ── 1. Réclamation — intake → response → closure ─────────────────────────
  const reclamation = await createReclamation(
    reclamationInputSchema.parse({
      source: 'CLIENT',
      receivedAt: '2026-07-01',
      description: 'VERIFY9-Le support pédagogique du jour 2 était incomplet',
      confidentiality: 'INTERNE',
    }),
  )
  assert(reclamation.responseAt === null && reclamation.closedAt === null, 'A new réclamation has no response and is not closed')

  const responded = await respondToReclamation(reclamation.id, { responseText: 'Support corrigé et renvoyé', close: false })
  assert(responded.responseText !== null && responded.responseAt !== null, 'Responding sets responseText + responseAt')
  assert(responded.closedAt === null, 'Responding does not auto-close — closure is a separate, explicit act')

  const closed = await respondToReclamation(reclamation.id, { responseText: 'Support corrigé et renvoyé', close: true })
  assert(closed.closedAt !== null, 'Explicitly closing sets closedAt')

  // ── 2. Action — a NAMED owner is required, not "the team" ────────────────
  const noOwner = actionInputSchema.safeParse({
    origin: 'RECLAMATION',
    description: 'Réviser le support pédagogique',
    ownerId: '',
    dueDate: '2026-08-01',
  })
  assert(!noOwner.success, 'An action with no owner is rejected by validation')

  const action = await createAction(
    actionInputSchema.parse({
      origin: 'RECLAMATION',
      description: 'Réviser le support pédagogique du jour 2',
      ownerId: owner.id,
      dueDate: '2026-01-01', // in the past relative to fixture run — deliberately overdue
    }),
  )
  assert(action.status === 'OPEN', 'A new action starts OPEN')

  // ── 3. 🔴 "Actioned" is not an outcome — resolving requires real text ────
  const emptyOutcome = actionOutcomeInputSchema.safeParse({ outcome: '' })
  assert(!emptyOutcome.success, 'Resolving an action with no outcome text is rejected')

  const resolved = await resolveAction(action.id, actionOutcomeInputSchema.parse({ outcome: 'Support refait, diffusé aux 8 participants le 2026-07-05' }), owner.id)
  assert(resolved.status === 'DONE' && resolved.outcome !== null && resolved.verifiedAt !== null, 'Resolving sets status DONE, records the outcome text, and stamps verifiedAt')

  // ── 4. Overdue actions surface — this feeds the Slice 10 dashboard ───────
  const stillOpenOverdue = await createAction(
    actionInputSchema.parse({ origin: 'INTERNE', description: 'Action non traitée', ownerId: owner.id, dueDate: '2020-01-01' }),
  )
  const futureAction = await createAction(
    actionInputSchema.parse({ origin: 'INTERNE', description: 'Action future', ownerId: owner.id, dueDate: '2099-01-01' }),
  )
  const overdue = await findOverdueActions()
  const overdueIds = overdue.map((a) => a.id)
  assert(overdueIds.includes(stillOpenOverdue.id), 'An OPEN action past its due date surfaces as overdue')
  assert(!overdueIds.includes(resolved.id), 'A DONE action never surfaces as overdue, even if its due date has passed')
  assert(!overdueIds.includes(futureAction.id), 'An action whose due date is in the future does not surface as overdue')

  // ── 5. Veille — soWhat is required, not just a link ──────────────────────
  const veille = await createVeille(
    {
      type: 'LEGALE',
      source: 'Légifrance',
      summary: 'Évolution du référentiel Qualiopi sur le critère 3',
      soWhat: "Mise à jour du modèle d'accessibilité pour tracer la réponse à un besoin déclaré",
      date: '2026-07-01',
    },
    owner.id,
  )
  assert(veille.soWhat.length > 0, 'A veille entry always records what changed at PANDO because of it')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 9 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 9 amélioration continue verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
