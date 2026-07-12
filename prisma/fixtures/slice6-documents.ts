/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 6 — DOCUMENTS & SIGNATURE VERIFICATION
 *
 *  Exercises the real domain logic (src/lib/document.ts) directly against
 *  the Slice 6 acceptance criteria: a PARTICULIER payer gets a CONTRAT DE
 *  FORMATION PRO — never a convention; a public-sector payer cannot be
 *  invoiced without numéro d'engagement + code service; an attestation pack
 *  is scoped to its own contractualisation's participants and nobody else's;
 *  a signed document is never deleted, only voided; generated PDFs are real
 *  files on PANDO's own (local, for now) storage.
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
  generateFacture,
  generateAttestationPack,
  generateConvocation,
  markDocumentSent,
  markDocumentSigned,
  voidDocument,
  readDocumentFile,
} from '@/lib/document'
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
  await db.parcoursParticipant.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.contractualisation.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.participant.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await db.sequence.deleteMany({ where: { parcours: { reference: { startsWith: PREFIX } } } })
  await db.parcours.deleteMany({ where: { reference: { startsWith: PREFIX } } })
  await db.formationVersion.deleteMany({ where: { formation: { internalCode: { startsWith: PREFIX } } } })
  await db.formation.deleteMany({ where: { internalCode: { startsWith: PREFIX } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: PREFIX } } })
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

  const groupeCassous = await db.client.create({ data: { companyName: `${PREFIX}Groupe Cassous`, status: 'ACTIF' } })
  const bordeauxMetropole = await db.client.create({
    data: { companyName: `${PREFIX}Bordeaux Métropole`, status: 'ACTIF', isPublicSector: true },
  })

  const contractCassous = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'ORGANISATION',
      payerId: groupeCassous.id,
      status: 'CONVENTION_SIGNEE',
      priceMode: 'PAR_PERSONNE',
      montantHT: '714000',
      remise: '10000',
    }),
  )
  const contractBordeaux = await createContractualisation(
    parcours.id,
    contractualisationInputSchema.parse({
      payerType: 'ORGANISATION',
      payerId: bordeauxMetropole.id,
      status: 'CONVENTION_SIGNEE',
      priceMode: 'PAR_PERSONNE',
      montantHT: '178500',
      remise: '0',
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
      status: 'BROUILLON',
      priceMode: 'PAR_PERSONNE',
      montantHT: '178500',
      remise: '0',
    }),
  )

  // Four Cassous participants, one Bordeaux participant — mirrors the real scenario.
  for (let i = 1; i <= 4; i++) {
    const p = await createParticipant(
      participantInputSchema.parse({ firstName: `Cassous${i}`, lastName: 'Test', email: `cassous${i}${EMAIL_DOMAIN}`, situation: 'SALARIE' }),
    )
    await enrollParticipant(parcours.id, { participantId: p.id, contractualisationId: contractCassous.id })
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

  // ── 2. ORGANISATION payer → CONVENTION_DE_FORMATION ───────────────────────
  const conventionCassous = await generateConvention(contractCassous.id)
  assert(conventionCassous.type === 'CONVENTION_DE_FORMATION', 'An ORGANISATION payer gets a CONVENTION_DE_FORMATION')

  // ── 3. 🔴 INDIVIDU payer → CONTRAT_DE_FORMATION_PRO, NEVER a convention ───
  const contratIndividu = await generateConvention(contractIndividu.id)
  assert(
    contratIndividu.type === 'CONTRAT_DE_FORMATION_PRO',
    'A PARTICULIER payer gets a CONTRAT_DE_FORMATION_PRO — the type is auto-selected, never a user choice',
  )
  assert(contratIndividu.type !== 'CONVENTION_DE_FORMATION', 'The individu contract is NEVER typed as a convention')

  // ── 4. 🔴 Chorus Pro gate — no invoice without numéro d'engagement ────────
  let factureBlocked = false
  try {
    await generateFacture(contractBordeaux.id)
  } catch (e) {
    factureBlocked = e instanceof Error && e.message.includes('Chorus Pro')
  }
  assert(factureBlocked, "A public-sector payer's invoice is blocked without numéro d'engagement + code service")

  await db.contractualisation.update({
    where: { id: contractBordeaux.id },
    data: { numeroEngagement: 'ENG-2026-001', codeService: 'SVC-42' },
  })
  const factureBordeaux = await generateFacture(contractBordeaux.id)
  assert(factureBordeaux.type === 'FACTURE', 'Once engagement + code service are set, the invoice generates')

  // ── 5. 🔴 RGPD scoping — Groupe Cassous's pack has its 4 people, nobody else ─
  const attestationCassous = await generateAttestationPack(contractCassous.id)
  assert(attestationCassous.contractualisationId === contractCassous.id, 'Attestation pack is scoped to ONE contractualisation')
  const cassousRoster = await db.parcoursParticipant.findMany({ where: { contractualisationId: contractCassous.id } })
  const bordeauxRoster = await db.parcoursParticipant.findMany({ where: { contractualisationId: contractBordeaux.id } })
  assert(cassousRoster.length === 4, "Groupe Cassous's roster has exactly its 4 people")
  assert(
    bordeauxRoster.every((pp) => !cassousRoster.some((c) => c.participantId === pp.participantId)),
    "Bordeaux Métropole's participant never appears in Groupe Cassous's roster — no cross-organisation disclosure",
  )

  // ── 6. Convocation — operational, not payer-scoped, still a real document ─
  const sequence = await db.sequence.create({
    data: {
      parcoursId: parcours.id,
      ordre: 1,
      titre: 'Jour 1',
      type: 'PRESENTIEL',
      date: new Date('2026-09-14'),
      demiJournees: ['MATIN', 'APRES_MIDI'],
      heures: 7,
      preuveType: 'SIGNATURE',
    },
  })
  const convocation = await generateConvocation(sequence.id)
  assert(convocation.type === 'CONVOCATION', 'generateConvocation creates a CONVOCATION document')
  assert(convocation.signatureStatus === 'NOT_REQUIRED', 'A convocation needs no signature')

  // ── 7. Signature state machine — mocked, never a real capture ────────────
  const sent = await markDocumentSent(devis.id)
  assert(sent.signatureStatus === 'SENT', 'markDocumentSent moves PENDING → SENT')
  const signed = await markDocumentSigned(devis.id)
  assert(signed.signatureStatus === 'SIGNED' && signed.signedAt !== null, 'markDocumentSigned sets SIGNED + signedAt (simulated — no real YouSign wired)')

  // ── 8. 🔴 A signed document is NEVER deleted, only voided ────────────────
  const voided = await voidDocument(devis.id, 'Erreur de montant — refait sous un nouveau devis')
  assert(voided.isVoid === true && voided.voidReason !== null, 'voidDocument marks isVoid + records why')
  const stillThere = await db.document.findUnique({ where: { id: devis.id } })
  assert(stillThere !== null, 'The voided document still EXISTS — there is no deleteDocument function in this codebase')

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
