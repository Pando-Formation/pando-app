/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 10 — PILOTAGE VERIFICATION · THE RISK RADAR
 *
 *  Exercises the real domain logic (src/lib/pilotage.ts) against the
 *  Slice 10 acceptance criteria: every category of alert actually surfaces
 *  and links straight to the record, parcours-at-risk ranks by how many
 *  distinct problems touch them, and margin uses the formateur's TRUE cost
 *  (TTC external, 0 internal) — never the notional day rate.
 *
 *  Alerts/CA/margin are computed over the WHOLE database (that's the
 *  point — a risk radar can't be scoped to one fixture's rows), so this
 *  fixture asserts DELTAS and PRESENCE, not exact totals, and runs
 *  alongside whatever real-data.ts has already seeded.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference prefixed VERIFY10-.
 *
 *  Run:     npm run verify:slice10
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { createFormationWithVersion } from '@/lib/formation'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, addSequence } from '@/lib/parcours'
import { contractualisationInputSchema, participantInputSchema } from '@/lib/validation/participant'
import { createContractualisation, createParticipant, enrollParticipant } from '@/lib/participant'
import { createAction } from '@/lib/amelioration'
import { getAlerts, groupAlertsByCategory, getParcoursAtRisk, getCaTotal, getMargin, getMonthlyCaSeries, getMonthlyParticipantsSeries } from '@/lib/pilotage'
import { formateurDayCost } from '@/lib/money'
import { generateDevis, generateConvention, generateFactureDocument, markDocumentSent, markDocumentSigned } from '@/lib/document'
import { createFacture, markFactureSent, markFacturePaid } from '@/lib/facturation'

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

const PREFIX = 'VERIFY10-'
const EMAIL_DOMAIN = '@verify-slice10.test'

async function cleanup() {
  await db.document.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.communicationMessage.deleteMany({ where: { recipientEmail: { endsWith: EMAIL_DOMAIN } } })
  await db.communicationSequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.contractualisation.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.formateurCompetence.deleteMany({ where: { formateur: { email: { endsWith: EMAIL_DOMAIN } } } })
  await db.formateur.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  const owner = await db.user.findUnique({ where: { email: `owner${EMAIL_DOMAIN}` } })
  if (owner) {
    await db.actionAmelioration.deleteMany({ where: { ownerId: owner.id } })
    await db.user.delete({ where: { id: owner.id } })
  }
}

async function main() {
  log.head('SLICE 10 — PILOTAGE VERIFICATION')
  await cleanup()

  const caBefore = await getCaTotal()
  const marginBefore = await getMargin()

  // ── Setup — one parcours with a live alert in every category ─────────────
  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY10 — Bien Ancrer son Management',
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

  // Parcours A — confirmed, zero participants → "missing participant list"
  const parcoursA = await createParcours(
    parcoursInputSchema.parse({ reference: `${PREFIX}F1`, formationId: formation.id, pandoRole: 'PRESTATAIRE_DIRECT', track: 'INTER', status: 'CONFIRME', delaiReglement: '30' }),
  )

  // Parcours B — has a participant, an unsigned convention, a hard bounce,
  // and a missing positionnement — TWO+ distinct alert categories, so it
  // must outrank Parcours A in the at-risk ranking.
  const parcoursB = await createParcours(
    parcoursInputSchema.parse({ reference: `${PREFIX}F2`, formationId: formation.id, pandoRole: 'PRESTATAIRE_DIRECT', track: 'INTER', status: 'CONFIRME', delaiReglement: '30' }),
  )
  const sequenceB = await addSequence(
    parcoursB.id,
    sequenceInputSchema.parse({
      ordre: '1',
      titre: 'Jour 1',
      type: 'PRESENTIEL',
      date: '2026-09-14',
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: '7',
      montantHT: 178_500, // 🔴 v1.6 — the contract = all the séquences: priced here to exercise Contractualisation.montantHT derivation, unrelated to CA below (CA is paid-invoice cash, not contract value — see section 3).
      preuveType: 'SIGNATURE',
    }),
  )
  // A PAST séquence — only past, unfactured séquences are invoiceable (see listInvoiceableSequences) — needed for the real devis → convention → facture → payée pipeline in section 3.
  const invoiceableSequence = await addSequence(
    parcoursB.id,
    sequenceInputSchema.parse({
      ordre: '3',
      titre: 'Jour Facturé',
      type: 'PRESENTIEL',
      date: '2026-07-01',
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: '7',
      preuveType: 'SIGNATURE',
    }),
  )
  const client = await db.client.create({ data: { companyName: `${PREFIX}Client`, status: 'ACTIF' } })
  const contract = await createContractualisation(
    parcoursB.id,
    contractualisationInputSchema.parse({ payerType: 'ORGANISATION', payerId: client.id, status: 'BROUILLON' }),
  )
  const participant = await createParticipant(
    participantInputSchema.parse({ firstName: 'Bounce', lastName: 'Target', email: `bounce${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
  )
  await enrollParticipant(parcoursB.id, { participantId: participant.id, contractualisationId: contract.id })

  const template = await db.communicationTemplate.create({ data: { name: `${PREFIX}Template`, messages: [] } })
  const commSeq = await db.communicationSequence.create({ data: { parcoursId: parcoursB.id, templateId: template.id } })
  await db.communicationMessage.create({
    data: {
      sequenceId: commSeq.id,
      recipientEmail: `bounce${EMAIL_DOMAIN}`,
      subject: 'Convocation — test',
      body: 'test',
      scheduledFor: new Date(),
      sentAt: new Date(),
      deliveryStatus: 'HARD_BOUNCE',
      bouncedAt: new Date(),
    },
  })

  // ── 1. Every alert category surfaces and links to the record ─────────────
  const alerts = await getAlerts()
  assert(
    alerts.some((a) => a.category === 'Liste de participants manquante' && a.href === `/parcours/${parcoursA.id}`),
    'Missing-participants alert surfaces for the confirmed, empty parcours — links straight to it',
  )
  assert(
    alerts.some((a) => a.category === 'Convention non signée' && a.href === `/parcours/${parcoursB.id}`),
    'Unsigned-convention alert surfaces and links to the parcours',
  )
  assert(
    alerts.some((a) => a.category === 'Échec de livraison' && a.href === `/parcours/${parcoursB.id}`),
    'A hard bounce surfaces as a danger alert — this is the same rule Slice 7 exists to enforce, now visible on the radar',
  )
  assert(
    alerts.some((a) => a.category === 'Positionnement manquant'),
    'Missing-positionnement alert surfaces',
  )

  const ownerUser = await db.user.create({ data: { email: `owner${EMAIL_DOMAIN}`, name: 'Verify Owner', roles: ['SUPER_ADMIN'], authMethod: 'MAGIC_LINK' } })
  await createAction({ origin: 'INTERNE', description: `${PREFIX}Action en retard`, ownerId: ownerUser.id, dueDate: '2020-01-01' })
  const alertsWithAction = await getAlerts()
  assert(
    alertsWithAction.some((a) => a.category === 'Action en retard' && a.message.includes(`${PREFIX}Action en retard`)),
    'An overdue action from Slice 9 surfaces on the radar',
  )

  const formateurExpiring = await db.formateur.create({
    data: { firstName: 'Expiring', lastName: 'Cert', email: `expiring${EMAIL_DOMAIN}`, contractType: 'EXTERNE_PRESTATAIRE' },
  })
  const soon = new Date()
  soon.setDate(soon.getDate() + 10)
  await db.formateurCompetence.create({ data: { formateurId: formateurExpiring.id, type: 'CERTIFICATION', title: 'Test cert', date: new Date(), expiresAt: soon } })
  const alertsWithCert = await getAlerts()
  assert(
    alertsWithCert.some((a) => a.category === 'Certification bientôt expirée' && a.href === `/formateurs/${formateurExpiring.id}`),
    'An expiring certification (< 60 days) surfaces and links to the formateur',
  )

  // ── 1b. Alerts group into one card per category, worst severity wins ─────
  const groups = groupAlertsByCategory(alertsWithCert)
  const unsignedGroup = groups.find((g) => g.category === 'Convention non signée')
  assert(unsignedGroup !== undefined && unsignedGroup.alerts.length >= 1, 'Each category collapses into one group carrying all its alerts')
  const missingParticipantsGroup = groups.find((g) => g.category === 'Liste de participants manquante')
  assert(missingParticipantsGroup?.severity === 'danger', 'A danger-only category groups as danger')
  const categorySet = new Set(groups.map((g) => g.category))
  assert(categorySet.size === groups.length, 'No category appears in two separate groups — grouping is a true partition')

  // ── 2. Parcours-at-risk ranks by distinct alert categories ───────────────
  const atRisk = await getParcoursAtRisk(alertsWithCert)
  const riskA = atRisk.find((p) => p.id === parcoursA.id)
  const riskB = atRisk.find((p) => p.id === parcoursB.id)
  assert(riskA !== undefined && riskA.score === 1, 'Parcours A (one problem) scores 1')
  assert(riskB !== undefined && riskB.score >= 3, 'Parcours B (unsigned convention + hard bounce + missing positionnement) scores at least 3')
  assert(atRisk.indexOf(riskB!) < atRisk.indexOf(riskA!), 'The parcours with more distinct problems ranks ABOVE the one with fewer — this is the point of "at risk, ranked"')

  // ── 3. 🔴 CA = cash collected, not contracted value ───────────────────────
  const caAfterContract = await getCaTotal()
  assert(caAfterContract === caBefore, "Creating a contractualisation — even a priced one — moves CA by ZERO: it isn't an invoice, let alone a paid one")

  // Real pipeline: devis → convention → facture → envoyée → payée. No shortcuts.
  const devisPilotage = await generateDevis(contract.id)
  await markDocumentSent(devisPilotage.id)
  await markDocumentSigned(devisPilotage.id)
  const conventionPilotage = await generateConvention(contract.id)
  await markDocumentSent(conventionPilotage.id)
  await markDocumentSigned(conventionPilotage.id)

  const facturePilotage = await createFacture(contract.id, { sequenceIds: [invoiceableSequence.id], montantHT: 178_500 })
  await generateFactureDocument(facturePilotage.id)
  const caAfterUnsentFacture = await getCaTotal()
  assert(caAfterUnsentFacture === caBefore, 'A generated-but-unsent invoice still moves CA by ZERO')

  await markFactureSent(facturePilotage.id)
  const caAfterSentUnpaid = await getCaTotal()
  assert(caAfterSentUnpaid === caBefore, 'A SENT-but-unpaid invoice STILL moves CA by ZERO — sent is not the same as collected')

  await markFacturePaid(facturePilotage.id)
  const caAfter = await getCaTotal()
  assert(caAfter - caBefore === 178_500, "CA increases by exactly the PAID invoice's montantHT (1 785 €) — the moment money actually arrives, not before")

  // ── 4. 🔴 Margin — TTC for external, 0 for internal, never the notional rate ─
  const formateurExternal = await db.formateur.create({
    data: { firstName: 'External', lastName: 'Test', email: `external${EMAIL_DOMAIN}`, contractType: 'EXTERNE_PRESTATAIRE', siren: '812345678', tvaRate: 0.2, tarifJour: 70_000, forfaitDeplacement: 2_000 },
  })
  await addSequence(
    parcoursB.id,
    sequenceInputSchema.parse({ ordre: '2', titre: 'Jour 2', type: 'PRESENTIEL', date: '2026-09-21', demiJournees: ['MATIN', 'APRES_MIDI'], heures: '7', preuveType: 'SIGNATURE' }),
  )
  await db.sequence.updateMany({ where: { parcoursId: parcoursB.id, ordre: 2 }, data: { formateurId: formateurExternal.id } })

  const marginAfter = await getMargin()
  const expectedExternalCost = formateurDayCost({ contractType: 'EXTERNE_PRESTATAIRE', tarifJour: 70_000, tvaRate: 0.2, forfaitDeplacement: 2_000 }) // 860€ = 86 000 cents, ×1 jour-équivalent (7h/7)
  assert(
    marginAfter.formateurCost - marginBefore.formateurCost === expectedExternalCost,
    `formateurCost increases by exactly the external formateur's TTC day cost (${expectedExternalCost} cents = 860€), not the notional 700€ rate`,
  )
  assert(marginAfter.margin === marginAfter.revenue - marginAfter.formateurCost, 'margin = revenue − formateurCost, always')

  // ── 5. Monthly series — bucketed by the current calendar month ───────────
  const caSeries = await getMonthlyCaSeries(5)
  assert(caSeries.length === 5, 'getMonthlyCaSeries(5) always returns exactly 5 points, even for months with zero activity')
  const currentMonthCa = caSeries[caSeries.length - 1]!
  assert(currentMonthCa.value >= 178_500, "This fixture's invoice (paid just now) is counted in the CURRENT month's bucket, keyed off Facture.paidAt")

  const participantsSeries = await getMonthlyParticipantsSeries(5)
  assert(participantsSeries.length === 5, 'getMonthlyParticipantsSeries(5) always returns exactly 5 points')
  const currentMonthParticipants = participantsSeries[participantsSeries.length - 1]!
  assert(currentMonthParticipants.value >= 1, "This fixture's enrollment (created just now) is counted in the CURRENT month's bucket")
  assert(
    caSeries.every((p) => typeof p.label === 'string' && p.label.length > 0) &&
      participantsSeries.every((p) => typeof p.label === 'string' && p.label.length > 0),
    'Every bucket carries a non-empty month label — a chart axis with a blank tick is a bug',
  )

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 10 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 10 pilotage verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
