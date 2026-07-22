/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 11 — RECURRING INVOICING VERIFICATION
 *
 *  Exercises src/lib/facturation.ts end to end: a contractualisation is
 *  billed progressively as séquences are delivered (typically monthly), not
 *  once as a lump sum. Each Facture is hand-scoped to a subset of already
 *  delivered séquences with a hand-entered montant — this fixture checks
 *  the full BROUILLON → générée → envoyée → payée lifecycle, the Chorus Pro
 *  branch for public-sector payers, and that a séquence can never be
 *  attached to two invoices at once.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference prefixed VERIFY11-.
 *
 *  Run:     npm run verify:slice11
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { createFormationWithVersion } from '@/lib/formation'
import { parcoursInputSchema } from '@/lib/validation/parcours'
import { createParcours } from '@/lib/parcours'
import { contractualisationInputSchema } from '@/lib/validation/participant'
import { createContractualisation } from '@/lib/participant'
import { generateDevis, generateConvention, generateFactureDocument, markDocumentSent, markDocumentSigned } from '@/lib/document'
import { listInvoiceableSequences, createFacture, markFactureSent, markFactureChorusProSent, markFacturePaid, deleteFacture } from '@/lib/facturation'
import { toCents } from '@/lib/money'

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

const PREFIX = 'VERIFY11-'

async function cleanup() {
  await db.document.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.facture.deleteMany({ where: { contractualisation: { parcours: { reference: { startsWith: PREFIX } } } } })
  await db.contractualisation.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: PREFIX } } })
}

async function main() {
  log.head('SLICE 11 — RECURRING INVOICING VERIFICATION')
  await cleanup()

  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY11 — Bien Ancrer son Management',
    subtitle: null,
    brandProgramme: null,
    requiresFullCohort: false,
    intraOnly: false,
    format: 'PRESENTIEL',
    durationHours: '21',
    durationDays: '3',
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

  const formationSession = await db.formationSession.create({
    data: { parcoursId: parcours.id, ordre: 1, titre: 'Session facturation' },
  })

  // Two past séquences (September) and one future séquence (never invoiceable).
  const seqSept1 = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 1, titre: 'Jour 1', type: 'PRESENTIEL', date: new Date('2026-06-01'), demiJournees: ['MATIN', 'APRES_MIDI'], heures: 7, preuveType: 'SIGNATURE' },
  })
  const seqSept2 = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 2, titre: 'Jour 2', type: 'PRESENTIEL', date: new Date('2026-06-08'), demiJournees: ['MATIN', 'APRES_MIDI'], heures: 7, preuveType: 'SIGNATURE' },
  })
  const seqFuture = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 3, titre: 'Jour 3', type: 'PRESENTIEL', date: new Date('2027-06-01'), demiJournees: ['MATIN'], heures: 3.5, preuveType: 'SIGNATURE' },
  })

  const client = await db.client.create({ data: { companyName: `${PREFIX}OPTA'S`, status: 'ACTIF' } })
  const publicClient = await db.client.create({ data: { companyName: `${PREFIX}Mairie`, status: 'ACTIF', isPublicSector: true } })

  const contract = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({ payerType: 'ORGANISATION', payerId: client.id }),
  )
  const publicContract = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({ payerType: 'ORGANISATION', payerId: publicClient.id }),
  )

  // ── 0. Creating a facture before the convention is signed is blocked ─────
  let earlyBlocked = false
  try {
    await createFacture(contract.id, { sequenceIds: [seqSept1.id], montantHT: toCents(2000) })
  } catch (e) {
    earlyBlocked = e instanceof Error && e.message.includes('convention doit être signée')
  }
  assert(earlyBlocked, 'A facture cannot be created before the convention is signed')

  // Advance both contractualisations to CONVENTION_SIGNEE via the real pipeline.
  for (const c of [contract, publicContract]) {
    const devis = await generateDevis(c.id)
    await markDocumentSent(devis.id)
    await markDocumentSigned(devis.id)
    const convention = await generateConvention(c.id)
    await markDocumentSent(convention.id)
    await markDocumentSigned(convention.id)
  }

  // ── 1. listInvoiceableSequences — past & unbilled only ────────────────────
  const invoiceable = await listInvoiceableSequences(contract.id)
  const invoiceableIds = invoiceable.map((s) => s.id).sort()
  assert(
    JSON.stringify(invoiceableIds) === JSON.stringify([seqSept1.id, seqSept2.id].sort()),
    'Only past, unbilled séquences are invoiceable — the future séquence is excluded',
  )

  // ── 2. Create a facture covering one séquence, hand-entered montant ──────
  const septFacture = await createFacture(contract.id, { sequenceIds: [seqSept1.id], montantHT: toCents(2000) })
  const afterFirstInvoice = await listInvoiceableSequences(contract.id)
  assert(
    afterFirstInvoice.length === 1 && afterFirstInvoice[0]?.id === seqSept2.id,
    'Once a séquence is attached to a facture, it drops out of the invoiceable pool',
  )

  // ── 3. markFactureSent requires a generated document first ───────────────
  let sentBlocked = false
  try {
    await markFactureSent(septFacture.id)
  } catch {
    sentBlocked = true
  }
  assert(sentBlocked, 'markFactureSent throws before the facture has been generated')

  await generateFactureDocument(septFacture.id)
  await markFactureSent(septFacture.id)
  const septAfterSend = await db.facture.findUniqueOrThrow({ where: { id: septFacture.id } })
  assert(septAfterSend.sentAt !== null, 'markFactureSent sets sentAt once a document exists')

  // ── 4. markFacturePaid requires sentAt first ──────────────────────────────
  const octoberFacture = await createFacture(contract.id, { sequenceIds: [seqSept2.id], montantHT: toCents(1800) })
  await generateFactureDocument(octoberFacture.id)
  let paidBlocked = false
  try {
    await markFacturePaid(octoberFacture.id)
  } catch (e) {
    paidBlocked = e instanceof Error && e.message.includes('envoyée au préalable')
  }
  assert(paidBlocked, 'markFacturePaid throws before the facture has been sent')

  await markFactureSent(octoberFacture.id)
  await markFacturePaid(octoberFacture.id)
  const octoberAfterPaid = await db.facture.findUniqueOrThrow({ where: { id: octoberFacture.id } })
  assert(octoberAfterPaid.paidAt !== null, 'markFacturePaid sets paidAt once sent')
  const septStillUnpaid = await db.facture.findUniqueOrThrow({ where: { id: septFacture.id } })
  assert(septStillUnpaid.paidAt === null, 'Marking one facture paid does not affect a different facture on the same contractualisation')

  // ── 5. Chorus Pro — private-sector payer is rejected, public-sector works ─
  let chorusRejectedPrivate = false
  try {
    await markFactureChorusProSent(septFacture.id)
  } catch (e) {
    chorusRejectedPrivate = e instanceof Error && e.message.includes('secteur public')
  }
  assert(chorusRejectedPrivate, 'markFactureChorusProSent rejects a private-sector payer')

  await db.contractualisation.update({ where: { id: publicContract.id }, data: { numeroEngagement: 'ENG-11', codeService: 'SVC-11' } })
  const publicFacture = await createFacture(publicContract.id, { sequenceIds: [], montantHT: 0 }).catch(() => null)
  assert(publicFacture === null, 'createFacture rejects an empty sequenceIds list')

  // seqSept1/seqSept2 both already belong to `contract`'s invoices by this point —
  // sequences aren't payer-scoped, so a séquence billed by ONE payer is off the
  // table for every other payer on the same parcours too.
  const publicInvoiceable = await listInvoiceableSequences(publicContract.id)
  assert(publicInvoiceable.length === 0, 'A séquence already invoiced by one payer is unavailable to every other payer on the parcours')

  const seqOct1 = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 6, titre: 'Jour 6', type: 'PRESENTIEL', date: new Date('2026-06-22'), demiJournees: ['MATIN'], heures: 3.5, preuveType: 'SIGNATURE' },
  })
  const seqOct2 = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 7, titre: 'Jour 7', type: 'PRESENTIEL', date: new Date('2026-06-29'), demiJournees: ['MATIN'], heures: 3.5, preuveType: 'SIGNATURE' },
  })

  // ── 6. Chorus Pro send counts as "sent" too — no separate manual step needed ─
  const decFacture = await createFacture(publicContract.id, { sequenceIds: [seqOct1.id], montantHT: toCents(2200) })
  await generateFactureDocument(decFacture.id)
  await markFactureChorusProSent(decFacture.id)
  const decAfterChorus = await db.facture.findUniqueOrThrow({ where: { id: decFacture.id } })
  assert(decAfterChorus.chorusProSentAt !== null, 'markFactureChorusProSent sets chorusProSentAt')
  assert(decAfterChorus.sentAt !== null, 'A Chorus Pro send also counts as "sent" — no separate manual "Marquer envoyée" is required')

  // ── 7. Reference/filename uniqueness across two invoices on the same contract ─
  const decFactureDoc = await db.document.findFirstOrThrow({ where: { factureId: decFacture.id } })
  const anotherPublicFacture = await createFacture(publicContract.id, { sequenceIds: [seqOct2.id], montantHT: toCents(900) })
  const anotherDoc = await generateFactureDocument(anotherPublicFacture.id)
  assert(anotherDoc.filename !== decFactureDoc.filename, 'Two invoices for the same payer never collide on filename')

  // ── 8. deleteFacture — only while still a draft (no generated document) ──
  const seqForDraft = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 4, titre: 'Jour 4', type: 'PRESENTIEL', date: new Date('2026-06-15'), demiJournees: ['MATIN'], heures: 3.5, preuveType: 'SIGNATURE' },
  })
  const draft = await createFacture(contract.id, { sequenceIds: [seqForDraft.id], montantHT: toCents(500) })
  let deleteBlockedAfterGeneration = false
  await generateFactureDocument(draft.id)
  try {
    await deleteFacture(draft.id)
  } catch {
    deleteBlockedAfterGeneration = true
  }
  assert(deleteBlockedAfterGeneration, 'A facture cannot be deleted once its document has been generated')

  const seqForDraft2 = await db.sequence.create({
    data: { parcoursId: parcours.id, formationSessionId: formationSession.id, ordre: 5, titre: 'Jour 5', type: 'PRESENTIEL', date: new Date('2026-06-16'), demiJournees: ['MATIN'], heures: 3.5, preuveType: 'SIGNATURE' },
  })
  const draft2 = await createFacture(contract.id, { sequenceIds: [seqForDraft2.id], montantHT: toCents(500) })
  await deleteFacture(draft2.id)
  const seqAfterDelete = await db.sequence.findUniqueOrThrow({ where: { id: seqForDraft2.id } })
  assert(seqAfterDelete.factureId === null, 'Deleting a draft facture frees its séquence back up for future invoicing')
  const factureGone = await db.facture.findUnique({ where: { id: draft2.id } })
  assert(factureGone === null, 'The deleted draft facture row is gone')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 11 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 11 recurring invoicing verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
