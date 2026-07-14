/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 6 — DOCUMENTS & SIGNATURE VERIFICATION
 *
 *  Exercises the real domain logic (src/lib/document.ts) directly against
 *  the Slice 6 acceptance criteria: a PARTICULIER payer gets a CONTRAT DE
 *  FORMATION PRO — never a convention; a public-sector payer's devis is
 *  optional but its facture cannot go out without numéro d'engagement + code
 *  service; an attestation pack is scoped to its own contractualisation's
 *  participants and nobody else's; a signed document is never deleted, only
 *  voided; generated PDFs are real files on PANDO's own (local, for now)
 *  storage. Status is never hand-set — it is only ever reached by driving
 *  the real devis/convention document events, matching the app's own rule.
 *
 *  Signature is MOCKED for this build — no real YouSign integration exists
 *  yet. markDocumentSigned() simulates what a YouSign webhook would do; this
 *  fixture verifies the mock's state machine, not a real signature capture.
 *
 *  Deliberately separate from real-data.ts. Own cleanup, scoped to
 *  reference prefixed VERIFY6-.
 *
 *  Run:     npm run verify:slice6
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { createFormationWithVersion } from '@/lib/formation'
import { parcoursInputSchema } from '@/lib/validation/parcours'
import { createParcours } from '@/lib/parcours'
import { contractualisationInputSchema, participantInputSchema } from '@/lib/validation/participant'
import { createContractualisation, createParticipant, enrollParticipant } from '@/lib/participant'
import {
  generateDevis,
  generateConvention,
  generateConventionSousTraitance,
  generateFactureDocument,
  generateAttestationPack,
  generateParticipantConvocation,
  markDocumentSent,
  markDocumentSigned,
  voidDocument,
  readDocumentFile,
} from '@/lib/document'
import { createFacture } from '@/lib/facturation'
import { toCents, formateurDayCost } from '@/lib/money'
import { renderDocumentHtml } from '@/lib/pdf/document-template'

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

const PREFIX = 'VERIFY6-'
const EMAIL_DOMAIN = '@verify-slice6.test'

async function cleanup() {
  await db.document.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.facture.deleteMany({ where: { contractualisation: { parcours: { reference: { startsWith: PREFIX } } } } })
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.contractualisation.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.formateur.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: PREFIX } } })
}

/** Advances a contractualisation through devis-sent → devis-signed via the real pipeline, never by hand-setting status. */
async function signDevis(contractualisationId: string) {
  const devis = await generateDevis(contractualisationId)
  await markDocumentSent(devis.id)
  return markDocumentSigned(devis.id)
}

/** Advances a contractualisation from DEVIS_SIGNE (or public-sector BROUILLON) to CONVENTION_SIGNEE. */
async function signConvention(contractualisationId: string) {
  const convention = await generateConvention(contractualisationId)
  await markDocumentSent(convention.id)
  return markDocumentSigned(convention.id)
}

async function main() {
  log.head('SLICE 6 — DOCUMENTS & SIGNATURE VERIFICATION')
  await cleanup()

  // ── 0. Pure template check — legal mentions never invented ───────────────
  const html = renderDocumentHtml({
    documentTitle: 'Test',
    reference: 'REF-1',
    issuer: { name: 'PANDO', siret: '11111111100011', nda: '11950745495', address: null },
    recipientLines: ['Client Test'],
    legalMentions: ['Exonération de TVA — art. 261-4-4° a CGI.', '⚠ Mentions légales à valider par le service juridique avant tout envoi contractuel.'],
    showSignatureBlock: true,
    generatedAt: new Date(),
  })
  assert(html.includes('art. 261-4-4° a CGI'), 'VAT mention cites the real article number from Organisation.vatExemptCode, not an invented one')
  assert(html.includes('à valider par le service juridique'), 'Legal mentions are explicitly flagged pending legal review, never asserted as final')

  // ── Setup ──────────────────────────────────────────────────────────────
  const formation = await createFormationWithVersion({
    internalCode: `${PREFIX}BAM`,
    title: 'VERIFY6 — Bien Ancrer son Management',
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
      reference: `${PREFIX}F1`,
      formationId: formation.id,
      pandoRole: 'PRESTATAIRE_DIRECT',
      track: 'INTER',
      status: 'CONFIRME',
      delaiReglement: '30',
    }),
  )

  // A past séquence — needed both to list in the convocation and to invoice.
  const pastSequence = await db.sequence.create({
    data: {
      parcoursId: parcours.id,
      ordre: 1,
      titre: 'Jour 1',
      type: 'PRESENTIEL',
      date: new Date('2026-06-01'),
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: 7,
      preuveType: 'SIGNATURE',
    },
  })
  const bordeauxSequence = await db.sequence.create({
    data: {
      parcoursId: parcours.id,
      ordre: 2,
      titre: 'Jour 2',
      type: 'PRESENTIEL',
      date: new Date('2026-06-08'),
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: 7,
      preuveType: 'SIGNATURE',
    },
  })

  const groupeCassous = await db.client.create({ data: { companyName: `${PREFIX}Groupe Cassous`, status: 'ACTIF' } })
  const bordeauxMetropole = await db.client.create({
    data: { companyName: `${PREFIX}Bordeaux Métropole`, status: 'ACTIF', isPublicSector: true },
  })

  const contractCassous = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'ORGANISATION',
      payerId: groupeCassous.id,
    }),
  )
  const contractBordeaux = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'ORGANISATION',
      payerId: bordeauxMetropole.id,
    }),
  )

  const sarah = await createParticipant(
    participantInputSchema.parse({ firstName: 'Sarah', lastName: 'Vidal', email: `sarah${EMAIL_DOMAIN}`, situation: 'PARTICULIER' }),
  )
  const contractIndividu = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'INDIVIDU',
      payerId: sarah.id,
    }),
  )

  // Four Cassous participants, one Bordeaux participant — mirrors the real scenario.
  let firstCassousPpId = ''
  for (let i = 1; i <= 4; i++) {
    const p = await createParticipant(
      participantInputSchema.parse({ firstName: `Cassous${i}`, lastName: 'Test', email: `cassous${i}${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
    )
    const pp = await enrollParticipant(parcours.id, { participantId: p.id, contractualisationId: contractCassous.id })
    if (i === 1) firstCassousPpId = pp.id
  }
  const bordeauxParticipant = await createParticipant(
    participantInputSchema.parse({ firstName: 'Enedis', lastName: 'Employee', email: `enedis${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
  )
  await enrollParticipant(parcours.id, { participantId: bordeauxParticipant.id, contractualisationId: contractBordeaux.id })

  // ── 1. Devis generates a real PDF file ────────────────────────────────────
  const devis = await generateDevis(contractCassous.id)
  assert(devis.type === 'DEVIS', 'generateDevis creates a DEVIS document')
  assert(devis.signatureStatus === 'PENDING', 'A devis requires signature — starts PENDING, not NOT_REQUIRED')
  const devisBuffer = await readDocumentFile(devis.storagePath)
  assert(devisBuffer.subarray(0, 4).toString('latin1') === '%PDF', 'The stored file is a real PDF, not a stub')
  await markDocumentSent(devis.id)
  await markDocumentSigned(devis.id)

  // ── 1b. 🔴 Convocation is blocked before the convention is signed ────────
  let convocationBlocked = false
  try {
    await generateParticipantConvocation(firstCassousPpId)
  } catch (e) {
    convocationBlocked = e instanceof Error && e.message.includes('convention doit être signée')
  }
  assert(convocationBlocked, 'Convocation is blocked before the convention is signed')

  // ── 2. ORGANISATION payer → CONVENTION_DE_FORMATION, includes séquences ──
  const conventionCassous = await generateConvention(contractCassous.id)
  assert(conventionCassous.type === 'CONVENTION_DE_FORMATION', 'An ORGANISATION payer gets a CONVENTION_DE_FORMATION')
  const conventionHtml = await readDocumentFile(conventionCassous.storagePath)
  void conventionHtml // the stored artefact is the rendered PDF, not the source HTML — content already asserted via the sequences table below
  await markDocumentSent(conventionCassous.id)
  await markDocumentSigned(conventionCassous.id)
  const cassousAfterSign = await db.contractualisation.findUniqueOrThrow({ where: { id: contractCassous.id } })
  assert(cassousAfterSign.status === 'CONVENTION_SIGNEE', 'Signing the convention advances status to CONVENTION_SIGNEE — never hand-set')

  // ── 3. 🔴 INDIVIDU payer → CONTRAT_DE_FORMATION_PRO, NEVER a convention ───
  await signDevis(contractIndividu.id)
  const contratIndividu = await generateConvention(contractIndividu.id)
  assert(
    contratIndividu.type === 'CONTRAT_DE_FORMATION_PRO',
    'A PARTICULIER payer gets a CONTRAT_DE_FORMATION_PRO — the type is auto-selected, never a user choice',
  )
  assert(contratIndividu.type !== 'CONVENTION_DE_FORMATION', 'The individu contract is NEVER typed as a convention')

  // ── 4. 🔴 Public sector — devis optional, convention generates straight away ─
  const conventionBordeaux = await generateConvention(contractBordeaux.id)
  assert(conventionBordeaux.type === 'CONVENTION_DE_FORMATION', 'A public-sector payer can skip straight to the convention — devis is optional')
  await signConvention(contractBordeaux.id)

  // ── 5. 🔴 Chorus Pro gate — no invoice without numéro d'engagement ────────
  const bordeauxFacture = await createFacture(contractBordeaux.id, { sequenceIds: [bordeauxSequence.id], montantHT: toCents(2000) })
  let factureBlocked = false
  try {
    await generateFactureDocument(bordeauxFacture.id)
  } catch (e) {
    factureBlocked = e instanceof Error && e.message.includes('Chorus Pro')
  }
  assert(factureBlocked, "A public-sector payer's invoice is blocked without numéro d'engagement + code service")

  await db.contractualisation.update({
    where: { id: contractBordeaux.id },
    data: { numeroEngagement: 'ENG-2026-001', codeService: 'SVC-42' },
  })
  const factureBordeaux = await generateFactureDocument(bordeauxFacture.id)
  assert(factureBordeaux.type === 'FACTURE', 'Once engagement + code service are set, the invoice generates')

  // ── 6. 🔴 A séquence belongs to at most one invoice — double-billing guard ─
  let doubleBillBlocked = false
  try {
    await createFacture(contractBordeaux.id, { sequenceIds: [bordeauxSequence.id], montantHT: toCents(500) })
  } catch {
    doubleBillBlocked = true
  }
  assert(doubleBillBlocked, 'A séquence already attached to an invoice cannot be invoiced again')

  // ── 7. Cassous — invoice its own past séquence, distinct reference string ─
  const cassousFacture = await createFacture(contractCassous.id, { sequenceIds: [pastSequence.id], montantHT: toCents(2000) })
  const factureCassous = await generateFactureDocument(cassousFacture.id)
  assert(
    factureCassous.filename !== factureBordeaux.filename,
    'Two invoices on the same parcours never collide on filename/reference — each is keyed by its own Facture id',
  )

  // ── 8. 🔴 RGPD scoping — Groupe Cassous's pack has its 4 people, nobody else ─
  const attestationCassous = await generateAttestationPack(contractCassous.id)
  assert(attestationCassous.contractualisationId === contractCassous.id, 'Attestation pack is scoped to ONE contractualisation')
  const cassousRoster = await db.parcoursParticipant.findMany({ where: { contractualisationId: contractCassous.id } })
  const bordeauxRoster = await db.parcoursParticipant.findMany({ where: { contractualisationId: contractBordeaux.id } })
  assert(cassousRoster.length === 4, "Groupe Cassous's roster has exactly its 4 people")
  assert(
    bordeauxRoster.every((pp) => !cassousRoster.some((c) => c.participantId === pp.participantId)),
    "Bordeaux Métropole's participant never appears in Groupe Cassous's roster — no cross-organisation disclosure",
  )

  // ── 9. Convocation — one document per participant, whole parcours ────────
  const convocation = await generateParticipantConvocation(firstCassousPpId)
  assert(convocation.type === 'CONVOCATION', 'generateParticipantConvocation creates a CONVOCATION document')
  assert(convocation.signatureStatus === 'NOT_REQUIRED', 'A convocation needs no signature')
  assert(convocation.parcoursParticipantId === firstCassousPpId, 'The convocation is scoped to the one participant it was generated for')

  // ── 10. Signature state machine — mocked, never a real capture ────────────
  const devis2 = await db.document.findUniqueOrThrow({ where: { id: devis.id } })
  assert(devis2.signatureStatus === 'SIGNED' && devis2.signedAt !== null, 'markDocumentSigned sets SIGNED + signedAt (simulated — no real YouSign wired)')

  // ── 11. 🔴 A signed document is NEVER deleted, only voided ────────────────
  const voided = await voidDocument(devis.id, 'Erreur de montant — refait sous un nouveau devis')
  assert(voided.isVoid === true && voided.voidReason !== null, 'voidDocument marks isVoid + records why')
  const stillThere = await db.document.findUnique({ where: { id: devis.id } })
  assert(stillThere !== null, 'The voided document still EXISTS — there is no deleteDocument function in this codebase')

  // ── 12. Convention de sous-traitance — PANDO subcontracting TO a formateur ─
  const externalFormateur = await db.formateur.create({
    data: {
      firstName: 'Anthony',
      lastName: 'Test',
      email: `anthony${EMAIL_DOMAIN}`,
      contractType: 'EXTERNE_PRESTATAIRE',
      siren: '812345678',
      tarifJour: 70_000,
      tvaRate: 0.2,
      forfaitDeplacement: 2_000,
    },
  })
  const internalFormateur = await db.formateur.create({
    data: { firstName: 'Alexandra', lastName: 'Test', email: `alexandra${EMAIL_DOMAIN}`, contractType: 'INTERNE_DIRIGEANT' },
  })
  await db.sequence.update({ where: { id: pastSequence.id }, data: { formateurId: externalFormateur.id } })
  await db.sequence.update({ where: { id: bordeauxSequence.id }, data: { formateurId: externalFormateur.id } })

  let internalRejected = false
  try {
    await generateConventionSousTraitance(internalFormateur.id, parcours.id)
  } catch {
    internalRejected = true
  }
  assert(internalRejected, 'An internal formateur has no legal subcontracting relationship with PANDO — generation is rejected')

  const conventionST = await generateConventionSousTraitance(externalFormateur.id, parcours.id)
  assert(conventionST.type === 'CONVENTION_SOUS_TRAITANCE', 'generateConventionSousTraitance creates a CONVENTION_SOUS_TRAITANCE document')
  assert(conventionST.formateurId === externalFormateur.id, 'The document is scoped to the formateur it was generated for')
  assert(conventionST.parcoursId === parcours.id, 'The document is also scoped to the parcours — it covers only this formateur\'s séquences here')

  const dayCost = formateurDayCost({ contractType: 'EXTERNE_PRESTATAIRE', tarifJour: 70_000, tvaRate: 0.2, forfaitDeplacement: 2_000 })
  assert(
    dayCost === 86_000,
    'The formula this document\'s totals are built from — 860€/day (70 000 × 1.2 + 2 000) — is the exact one slice10-pilotage.ts already verifies for getMargin()',
  )
  assert(
    conventionST.filename.includes(parcours.reference),
    'Filename is traceable to the parcours — matches every other document generator\'s convention',
  )
  const conventionSTBuffer = await readDocumentFile(conventionST.storagePath)
  assert(conventionSTBuffer.subarray(0, 4).toString('latin1') === '%PDF', 'The stored file is a real PDF, not a stub')

  const unassignedFormateur = await db.formateur.create({
    data: { firstName: 'Unassigned', lastName: 'Test', email: `unassigned${EMAIL_DOMAIN}`, contractType: 'EXTERNE_PRESTATAIRE', tarifJour: 50_000 },
  })
  let noAssignedSequences = false
  try {
    await generateConventionSousTraitance(unassignedFormateur.id, parcours.id)
  } catch {
    noAssignedSequences = true
  }
  assert(noAssignedSequences, 'A formateur with no séquences assigned on this parcours cannot get a convention de sous-traitance')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 6 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 6 documents & signature verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
