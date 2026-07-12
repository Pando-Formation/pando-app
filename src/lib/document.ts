import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type { DocumentType } from '@prisma/client'
import { euros } from '@/lib/money'
import { renderDocumentHtml, type DocumentRenderInput } from '@/lib/pdf/document-template'
import { htmlToPdfBuffer } from '@/lib/pdf/pdf-engine'
import type { FormationSnapshot } from '@/lib/formation'

/**
 * 🔴 STAND-IN FOR "PANDO's own bucket" (AGENTS.md §4 — signed PDFs and
 * invoices are mirrored into PANDO's storage, never left only in a third
 * party). No cloud storage is configured for local dev, so this is the
 * project's local disk, gitignored — a real, working file store, not an
 * invented placeholder path. Swapping this for GCS later only touches this
 * file.
 */
const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'documents')

async function writeDocumentFile(buffer: Buffer, filename: string): Promise<string> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true })
  const storedName = `${randomUUID()}-${filename}`
  await fs.writeFile(path.join(STORAGE_ROOT, storedName), buffer)
  return storedName // relative — resolved against STORAGE_ROOT on read
}

export async function readDocumentFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_ROOT, storagePath))
}

async function getIssuer() {
  const org = await db.organisation.findFirstOrThrow()
  return {
    name: org.name,
    siret: org.siret,
    nda: org.nda,
    address: [org.address, org.postalCode, org.city].filter(Boolean).join(' '),
    vatExemptCode: org.vatExemptCode,
  }
}

/** Loads everything a contractualisation-scoped document needs, once. */
async function loadContractualisationContext(contractualisationId: string) {
  const contract = await db.contractualisation.findUniqueOrThrow({
    where: { id: contractualisationId },
    include: {
      payerClient: true,
      payerParticipant: true,
      financeur: true,
      parcours: { include: { formationVersion: true } },
      participants: { include: { participant: true } },
    },
  })
  const snapshot = contract.parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const payerName =
    contract.payerClient?.companyName ??
    (contract.payerParticipant ? `${contract.payerParticipant.firstName} ${contract.payerParticipant.lastName}` : null) ??
    contract.financeur?.name ??
    'Payeur inconnu'
  const payerAddress = contract.payerClient
    ? [contract.payerClient.address, contract.payerClient.postalCode, contract.payerClient.city].filter(Boolean).join(' ')
    : null
  return { contract, snapshot, payerName, payerAddress }
}

async function saveDocument(input: {
  type: DocumentType
  html: string
  filename: string
  parcoursId?: string
  contractualisationId?: string
  sequenceId?: string
  requiresSignature: boolean
}) {
  const buffer = await htmlToPdfBuffer(input.html)
  const storagePath = await writeDocumentFile(buffer, input.filename)
  return db.document.create({
    data: {
      type: input.type,
      parcoursId: input.parcoursId ?? null,
      contractualisationId: input.contractualisationId ?? null,
      sequenceId: input.sequenceId ?? null,
      filename: input.filename,
      storagePath,
      mimeType: 'application/pdf',
      sizeBytes: buffer.byteLength,
      signatureStatus: input.requiresSignature ? 'PENDING' : 'NOT_REQUIRED',
    },
  })
}

const VAT_MENTION = (code: string) => `Exonération de TVA — ${code}. PANDO ne facture pas de TVA sur les prestations de formation professionnelle continue.`
const PENDING_LEGAL_REVIEW = '⚠ Mentions légales à valider par le service juridique avant tout envoi contractuel.'

/** DEVIS — one per contractualisation, list price minus its own remise. */
export async function generateDevis(contractualisationId: string) {
  const { contract, snapshot, payerName, payerAddress } = await loadContractualisationContext(contractualisationId)
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Devis',
    reference: `${contract.parcours.reference}-DEV-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName, ...(payerAddress ? [payerAddress] : [])],
    metaLines: [{ label: 'formation', value: snapshot.title }],
    table: {
      headers: ['Désignation', 'Montant HT'],
      rows: [
        [snapshot.title, euros(contract.montantHT + contract.remise)],
        ...(contract.remise > 0 ? [['Remise', `− ${euros(contract.remise)}`]] : []),
        ['Net à payer HT', euros(contract.montantHT)],
      ],
    },
    legalMentions: [VAT_MENTION(issuer.vatExemptCode), PENDING_LEGAL_REVIEW],
    showSignatureBlock: true,
    generatedAt: new Date(),
  } satisfies DocumentRenderInput)

  return saveDocument({
    type: 'DEVIS',
    html,
    filename: `devis-${contract.parcours.reference}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: true,
  })
}

/**
 * 🔴 A PARTICULIER payer gets a CONTRAT DE FORMATION PROFESSIONNELLE, not a
 * convention — auto-selected from payerType, never a user choice. The
 * rétractation window is stated on the document because it changes what the
 * payer is legally allowed to be asked to pay, and when.
 */
export async function generateConvention(contractualisationId: string) {
  const { contract, snapshot, payerName, payerAddress } = await loadContractualisationContext(contractualisationId)
  const issuer = await getIssuer()
  const isIndividu = contract.payerType === 'INDIVIDU'

  const legalMentions = [VAT_MENTION(issuer.vatExemptCode)]
  if (isIndividu && contract.retractationEndsAt) {
    legalMentions.push(
      `Délai de rétractation de 10 jours à compter de la signature, expirant le ${contract.retractationEndsAt.toLocaleDateString('fr-FR')}. Aucun paiement ne peut être exigé avant l'expiration de ce délai.`,
    )
  }
  legalMentions.push(PENDING_LEGAL_REVIEW)

  const html = renderDocumentHtml({
    documentTitle: isIndividu ? 'Contrat de formation professionnelle' : 'Convention de formation professionnelle',
    reference: `${contract.parcours.reference}-CONV-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName, ...(payerAddress ? [payerAddress] : [])],
    metaLines: [
      { label: 'formation', value: snapshot.title },
      { label: 'durée', value: `${snapshot.durationHours}h` },
    ],
    bodyParagraphs: [
      { heading: 'Objet', text: `La présente formalise l'engagement de ${issuer.name} à dispenser la formation "${snapshot.title}" au bénéfice des personnes inscrites au titre de la présente contractualisation.` },
    ],
    table: {
      headers: ['Désignation', 'Montant HT'],
      rows: [[snapshot.title, euros(contract.montantHT)]],
    },
    legalMentions,
    showSignatureBlock: true,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: isIndividu ? 'CONTRAT_DE_FORMATION_PRO' : 'CONVENTION_DE_FORMATION',
    html,
    filename: `${isIndividu ? 'contrat' : 'convention'}-${contract.parcours.reference}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: true,
  })
}

/** 🔴 FACTURE — a public-sector payer cannot be invoiced without numeroEngagement + codeService (Chorus Pro). */
export async function generateFacture(contractualisationId: string) {
  const { contract, snapshot, payerName, payerAddress } = await loadContractualisationContext(contractualisationId)
  const issuer = await getIssuer()

  if (contract.payerClient?.isPublicSector && (!contract.numeroEngagement || !contract.codeService)) {
    throw new Error(
      "Impossible d'émettre la facture : numéro d'engagement et code service Chorus Pro requis pour un payeur du secteur public.",
    )
  }

  const html = renderDocumentHtml({
    documentTitle: 'Facture',
    reference: `${contract.parcours.reference}-FACT-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName, ...(payerAddress ? [payerAddress] : [])],
    metaLines: [
      ...(contract.numeroEngagement ? [{ label: "n° d'engagement", value: contract.numeroEngagement }] : []),
      ...(contract.codeService ? [{ label: 'code service', value: contract.codeService }] : []),
    ],
    table: {
      headers: ['Désignation', 'Montant HT', 'Montant TTC'],
      rows: [[snapshot.title, euros(contract.montantHT), euros(contract.montantHT)]],
    },
    legalMentions: [VAT_MENTION(issuer.vatExemptCode), PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'FACTURE',
    html,
    filename: `facture-${contract.parcours.reference}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: false,
  })
}

export async function markChorusProSent(contractualisationId: string) {
  return db.contractualisation.update({ where: { id: contractualisationId }, data: { chorusProSentAt: new Date() } })
}

/**
 * 🔴 RGPD SCOPING — the whole reason this is per-contractualisation and not
 * per-parcours. Groupe Cassous's pack contains its 4 people and nobody else;
 * an inter cohort's other payers never appear. See 0002_check_constraints §A.
 */
export async function generateAttestationPack(contractualisationId: string) {
  const { contract, snapshot, payerName } = await loadContractualisationContext(contractualisationId)
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Attestations de formation',
    reference: `${contract.parcours.reference}-ATT-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName],
    bodyParagraphs: [
      {
        text: `${contract.participants.length} participant${contract.participants.length > 1 ? 's' : ''} inscrit${contract.participants.length > 1 ? 's' : ''} au titre de cette contractualisation — et uniquement ceux-ci.`,
      },
    ],
    table: {
      headers: ['Participant', 'Formation', 'Heures suivies (réelles)'],
      rows: contract.participants.map((pp) => [
        `${pp.participant.firstName} ${pp.participant.lastName}`,
        snapshot.title,
        `${pp.hoursAttended.toString()}h`,
      ]),
    },
    legalMentions: [PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'ATTESTATION_FORMATION',
    html,
    filename: `attestations-${contract.parcours.reference}-${payerName.replace(/\s+/g, '-')}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: false,
  })
}

/** Funder-facing — same RGPD scoping as the attestation pack, different artefact (item was missing entirely in the old model). */
export async function generateCertificatPack(contractualisationId: string) {
  const { contract, snapshot, payerName } = await loadContractualisationContext(contractualisationId)
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Certificats de réalisation',
    reference: `${contract.parcours.reference}-CERT-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName],
    table: {
      headers: ['Participant', 'Formation', 'Heures réalisées'],
      rows: contract.participants.map((pp) => [
        `${pp.participant.firstName} ${pp.participant.lastName}`,
        snapshot.title,
        `${pp.hoursAttended.toString()}h`,
      ]),
    },
    legalMentions: [PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'CERTIFICAT_REALISATION',
    html,
    filename: `certificats-${contract.parcours.reference}-${payerName.replace(/\s+/g, '-')}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: false,
  })
}

/** CONVOCATION — per séquence, every enrolled participant. Not payer-scoped: purely operational (who/where/when), no cross-payer personal-data disclosure. */
export async function generateConvocation(sequenceId: string) {
  const sequence = await db.sequence.findUniqueOrThrow({
    where: { id: sequenceId },
    include: {
      parcours: {
        include: {
          formationVersion: true,
          participants: { include: { participant: true } },
        },
      },
      formateur: true,
    },
  })
  const snapshot = sequence.parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Convocation',
    reference: `${sequence.parcours.reference}-CONVOC-${sequence.ordre}`,
    issuer,
    recipientLines: [`${sequence.parcours.participants.length} participant(s) convoqué(s)`],
    metaLines: [
      { label: 'séquence', value: sequence.titre },
      { label: 'date', value: sequence.date.toLocaleDateString('fr-FR') },
      { label: 'heures', value: `${sequence.heures.toString()}h` },
    ],
    bodyParagraphs: [
      { heading: 'Formation', text: snapshot.title },
      ...(sequence.lieu ? [{ heading: 'Lieu', text: sequence.lieu }] : []),
      ...(sequence.formateur ? [{ heading: 'Formateur', text: `${sequence.formateur.firstName} ${sequence.formateur.lastName}` }] : []),
    ],
    table: {
      headers: ['Participant'],
      rows: sequence.parcours.participants.map((pp) => [`${pp.participant.firstName} ${pp.participant.lastName}`]),
    },
    legalMentions: [],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'CONVOCATION',
    html,
    filename: `convocation-${sequence.parcours.reference}-seq${sequence.ordre}.pdf`,
    parcoursId: sequence.parcoursId,
    sequenceId,
    requiresSignature: false,
  })
}

export async function markDocumentSent(documentId: string) {
  return db.document.update({ where: { id: documentId }, data: { signatureStatus: 'SENT' } })
}

/** 🔴 Mocked — no real YouSign wired. A manual toggle, clearly not a real signature capture, so nobody mistakes it for one. */
export async function markDocumentSigned(documentId: string) {
  return db.document.update({ where: { id: documentId }, data: { signatureStatus: 'SIGNED', signedAt: new Date() } })
}

/** 🔴 A signed document is a legal fact — NEVER deleted, only voided. */
export async function voidDocument(documentId: string, reason: string) {
  return db.document.update({ where: { id: documentId }, data: { isVoid: true, voidReason: reason } })
}
