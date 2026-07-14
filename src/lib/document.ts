import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type { DocumentType } from '@prisma/client'
import { euros, formateurDayCost } from '@/lib/money'
import { renderDocumentHtml, renderMultiDocumentHtml, type DocumentRenderInput } from '@/lib/pdf/document-template'
import { htmlToPdfBuffer } from '@/lib/pdf/pdf-engine'
import type { FormationSnapshot } from '@/lib/formation'
import { CONTRACTUALISATION_STATUS_ORDER, isContractualisationAtLeast, type ProgressableStatus } from '@/lib/participant-labels'

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
      parcours: { include: { formationVersion: true, sequences: { orderBy: { ordre: 'asc' } } } },
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
  parcoursParticipantId?: string
  factureId?: string
  formateurId?: string
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
      parcoursParticipantId: input.parcoursParticipantId ?? null,
      factureId: input.factureId ?? null,
      formateurId: input.formateurId ?? null,
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

function assertNotCancelled(status: string) {
  if (status === 'ANNULEE') throw new Error('Impossible de générer un document : cette contractualisation est annulée.')
}

/** DEVIS — one per contractualisation, montant HT dérivé du prix des séquences du parcours. */
export async function generateDevis(contractualisationId: string) {
  const { contract, snapshot, payerName, payerAddress } = await loadContractualisationContext(contractualisationId)
  assertNotCancelled(contract.status)
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Devis',
    reference: `${contract.parcours.reference}-DEV-${contract.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName, ...(payerAddress ? [payerAddress] : [])],
    metaLines: [{ label: 'formation', value: snapshot.title }],
    table: {
      headers: ['Désignation', 'Montant HT'],
      rows: [[snapshot.title, euros(contract.montantHT)]],
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
  assertNotCancelled(contract.status)

  const isPublicSector = !!contract.payerClient?.isPublicSector
  if (!isPublicSector && !isContractualisationAtLeast(contract.status, 'DEVIS_SIGNE')) {
    throw new Error('Impossible de générer la convention : le devis doit être signé au préalable (payeur privé).')
  }

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
      { label: 'Montant HT total', value: euros(contract.montantHT) },
    ],
    bodyParagraphs: [
      { heading: 'Objet', text: `La présente formalise l'engagement de ${issuer.name} à dispenser la formation "${snapshot.title}" au bénéfice des personnes inscrites au titre de la présente contractualisation.` },
    ],
    table: {
      headers: ['Séquence', 'Date', 'Durée'],
      rows: contract.parcours.sequences.map((s) => [s.titre, s.date.toLocaleDateString('fr-FR'), `${s.heures.toString()}h`]),
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

/**
 * 🔴 CONVENTION DE SOUS-TRAITANCE — PANDO subcontracting TO an external
 * formateur (the opposite direction from Parcours.pandoRole = SOUS_TRAITANT,
 * which is PANDO being subcontracted BY a donneur d'ordre — a different
 * relationship entirely, do not conflate). Scoped by a (formateurId,
 * parcoursId) pair, not a single FK entity — there's no Contractualisation
 * or Facture to hang this off of. Covers every séquence this formateur is
 * assigned to on this parcours; the price per séquence is
 * formateurDayCost(formateur) prorated by heures/7 — the same formula
 * lib/pilotage.ts's getMargin() already uses, so the document total always
 * matches what pilotage reports as this formateur's cost here.
 */
export async function generateConventionSousTraitance(formateurId: string, parcoursId: string) {
  const formateur = await db.formateur.findUniqueOrThrow({ where: { id: formateurId } })
  if (formateur.contractType !== 'EXTERNE_PRESTATAIRE') {
    throw new Error('Impossible de générer une convention de sous-traitance : ce formateur est interne à PANDO.')
  }
  const parcours = await db.parcours.findUniqueOrThrow({ where: { id: parcoursId }, include: { formationVersion: true } })
  if (parcours.status === 'ANNULE') throw new Error('Impossible de générer un document : ce parcours est annulé.')

  const sequences = await db.sequence.findMany({ where: { parcoursId, formateurId }, orderBy: { ordre: 'asc' } })
  if (sequences.length === 0) {
    throw new Error("Aucune séquence n'est assignée à ce formateur sur ce parcours.")
  }

  const snapshot = parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const issuer = await getIssuer()
  const dayCost = formateurDayCost({
    contractType: formateur.contractType,
    tarifJour: formateur.tarifJour,
    tvaRate: Number(formateur.tvaRate),
    forfaitDeplacement: formateur.forfaitDeplacement,
  })
  const sequenceCost = (heures: unknown) => Math.round(dayCost * (Number(heures) / 7))
  const totalCost = sequences.reduce((sum, s) => sum + sequenceCost(s.heures), 0)
  const formateurAddress = [formateur.address, formateur.postalCode, formateur.city].filter(Boolean).join(' ')

  const html = renderDocumentHtml({
    documentTitle: 'Convention de sous-traitance',
    reference: `${parcours.reference}-ST-${formateur.id.slice(0, 8)}`,
    issuer,
    recipientLines: [
      `${formateur.firstName} ${formateur.lastName}`,
      ...(formateur.siren ? [`SIREN ${formateur.siren}`] : []),
      ...(formateurAddress ? [formateurAddress] : []),
    ],
    metaLines: [
      { label: 'formation', value: snapshot.title },
      { label: 'rémunération totale', value: euros(totalCost) },
    ],
    bodyParagraphs: [
      {
        heading: 'Objet',
        text: `La présente confie à ${formateur.firstName} ${formateur.lastName} l'animation des séquences ci-dessous du parcours "${snapshot.title}", pour le compte de ${issuer.name}.`,
      },
    ],
    table: {
      headers: ['Séquence', 'Date', 'Durée', 'Rémunération'],
      rows: sequences.map((s) => [s.titre, s.date.toLocaleDateString('fr-FR'), `${s.heures.toString()}h`, euros(sequenceCost(s.heures))]),
    },
    legalMentions: [PENDING_LEGAL_REVIEW],
    showSignatureBlock: true,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'CONVENTION_SOUS_TRAITANCE',
    html,
    filename: `convention-st-${parcours.reference}-${formateur.lastName}.pdf`,
    parcoursId,
    formateurId,
    requiresSignature: true,
  })
}

/**
 * 🔴 FACTURE — one per Facture record (see lib/facturation.ts), not one per
 * contractualisation. A contractualisation accrues many of these over the
 * life of the parcours; the reference string below is keyed off the
 * Facture's own id so two invoices for the same payer never collide.
 */
export async function generateFactureDocument(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({
    where: { id: factureId },
    include: {
      contractualisation: {
        include: { payerClient: true, payerParticipant: true, financeur: true, parcours: true },
      },
      sequences: { orderBy: { ordre: 'asc' } },
    },
  })
  const contract = facture.contractualisation
  assertNotCancelled(contract.status)
  if (contract.payerClient?.isPublicSector && (!contract.numeroEngagement || !contract.codeService)) {
    throw new Error(
      "Impossible d'émettre la facture : numéro d'engagement et code service Chorus Pro requis pour un payeur du secteur public.",
    )
  }

  const payerName =
    contract.payerClient?.companyName ??
    (contract.payerParticipant ? `${contract.payerParticipant.firstName} ${contract.payerParticipant.lastName}` : null) ??
    contract.financeur?.name ??
    'Payeur inconnu'
  const payerAddress = contract.payerClient
    ? [contract.payerClient.address, contract.payerClient.postalCode, contract.payerClient.city].filter(Boolean).join(' ')
    : null

  const issuer = await getIssuer()
  const dates = facture.sequences.map((s) => s.date).sort((a, b) => a.getTime() - b.getTime())
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  const periode =
    !firstDate || !lastDate
      ? '—'
      : firstDate.getTime() === lastDate.getTime()
        ? firstDate.toLocaleDateString('fr-FR')
        : `${firstDate.toLocaleDateString('fr-FR')} – ${lastDate.toLocaleDateString('fr-FR')}`

  const html = renderDocumentHtml({
    documentTitle: 'Facture',
    reference: `${contract.parcours.reference}-FACT-${facture.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName, ...(payerAddress ? [payerAddress] : [])],
    metaLines: [
      { label: 'période', value: periode },
      ...(contract.numeroEngagement ? [{ label: "n° d'engagement", value: contract.numeroEngagement }] : []),
      ...(contract.codeService ? [{ label: 'code service', value: contract.codeService }] : []),
    ],
    table: {
      headers: ['Séquence', 'Date'],
      rows: facture.sequences.map((s) => [s.titre, s.date.toLocaleDateString('fr-FR')]),
    },
    bodyParagraphs: [{ heading: 'Montant', text: `Montant HT : ${euros(facture.montantHT)}` }],
    legalMentions: [VAT_MENTION(issuer.vatExemptCode), PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'FACTURE',
    html,
    filename: `facture-${contract.parcours.reference}-${facture.id.slice(0, 8)}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId: contract.id,
    factureId: facture.id,
    requiresSignature: false,
  })
}

/**
 * 🔴 RGPD SCOPING — the whole reason this is per-contractualisation and not
 * per-parcours. Groupe Cassous's pack contains its 4 people and nobody else;
 * an inter cohort's other payers never appear. See 0002_check_constraints §A.
 */
/**
 * 🔴 ONE PDF, ONE ATTESTATION PER PARTICIPANT — not a shared roster. Four
 * participants on this contractualisation means four individually-titled,
 * individually-referenced attestation pages in one file, each a real
 * standalone certificate (own reference, addressed to that one person),
 * separated by a page break. The RGPD scoping (CHECK 14) is enforced simply
 * by which participants get a page: only `contract.participants`, never a
 * cross-payer roster.
 */
export async function generateAttestationPack(contractualisationId: string) {
  const { contract, snapshot, payerName } = await loadContractualisationContext(contractualisationId)
  if (contract.participants.length === 0) {
    throw new Error("Impossible de générer les attestations : aucun participant n'est rattaché à cette contractualisation.")
  }
  const issuer = await getIssuer()
  const generatedAt = new Date()

  const sections: DocumentRenderInput[] = contract.participants.map((pp) => ({
    documentTitle: 'Attestation de formation',
    reference: `${contract.parcours.reference}-ATT-${pp.id.slice(0, 8)}`,
    issuer,
    recipientLines: [`${pp.participant.firstName} ${pp.participant.lastName}`],
    metaLines: [
      { label: 'formation', value: snapshot.title },
      { label: 'durée suivie (réelle)', value: `${pp.hoursAttended.toString()}h` },
    ],
    bodyParagraphs: [
      {
        heading: 'Attestation',
        text: `Nous soussignés, ${issuer.name}, attestons que ${pp.participant.firstName} ${pp.participant.lastName} a suivi la formation "${snapshot.title}" pour une durée réelle de ${pp.hoursAttended.toString()}h.`,
      },
    ],
    legalMentions: [PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt,
  }))

  const html = renderMultiDocumentHtml('Attestations de formation', sections)

  return saveDocument({
    type: 'ATTESTATION_FORMATION',
    html,
    filename: `attestations-${contract.parcours.reference}-${payerName.replace(/\s+/g, '-')}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId,
    requiresSignature: false,
  })
}

/**
 * 🔴 CERTIFICAT DE RÉALISATION — lives at the Facture level, not the whole
 * contractualisation: it proves attendance for exactly the séquences THIS
 * invoice is billing, using real Attendance records — never the
 * participant's running hoursAttended total across the whole parcours,
 * which would include séquences outside this invoice (or not yet invoiced
 * at all). Same RGPD scoping as the attestation pack — only this
 * contractualisation's participants. One page, funder-facing.
 */
export async function generateFactureCertificat(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({
    where: { id: factureId },
    include: {
      contractualisation: {
        include: {
          payerClient: true,
          payerParticipant: true,
          financeur: true,
          parcours: { include: { formationVersion: true } },
          participants: { include: { participant: true } },
        },
      },
      sequences: { orderBy: { ordre: 'asc' } },
    },
  })
  const contract = facture.contractualisation
  const snapshot = contract.parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const payerName =
    contract.payerClient?.companyName ??
    (contract.payerParticipant ? `${contract.payerParticipant.firstName} ${contract.payerParticipant.lastName}` : null) ??
    contract.financeur?.name ??
    'Payeur inconnu'
  const issuer = await getIssuer()

  const sequenceIds = facture.sequences.map((s) => s.id)
  const attendances = await db.attendance.findMany({
    where: {
      participantId: { in: contract.participants.map((pp) => pp.participantId) },
      sequenceId: { in: sequenceIds },
      status: 'PRESENT',
    },
    include: { sequence: { select: { heures: true, demiJournees: true } } },
  })
  /** Real hours per (participant, séquence) pair — never the running total, since a
   * participant can attend one demi-journée of a séquence and miss the other. */
  const hoursByParticipantAndSequence = new Map<string, number>()
  for (const a of attendances) {
    const perDemiJournee = Number(a.sequence.heures) / a.sequence.demiJournees.length
    const key = `${a.participantId}|${a.sequenceId}`
    hoursByParticipantAndSequence.set(key, (hoursByParticipantAndSequence.get(key) ?? 0) + perDemiJournee)
  }

  const dates = facture.sequences.map((s) => s.date).sort((a, b) => a.getTime() - b.getTime())
  const first = dates[0]
  const last = dates[dates.length - 1]
  const periode =
    !first || !last
      ? '—'
      : first.getTime() === last.getTime()
        ? first.toLocaleDateString('fr-FR')
        : `${first.toLocaleDateString('fr-FR')} – ${last.toLocaleDateString('fr-FR')}`

  const html = renderDocumentHtml({
    documentTitle: 'Certificat de réalisation',
    reference: `${contract.parcours.reference}-CERT-${facture.id.slice(0, 8)}`,
    issuer,
    recipientLines: [payerName],
    metaLines: [
      { label: 'formation', value: snapshot.title },
      { label: 'période facturée', value: periode },
    ],
    table: {
      headers: ['Participant', 'Séquence', 'Date', 'Heures prévues', 'Heures réelles'],
      rows: contract.participants.flatMap((pp) =>
        facture.sequences.map((s) => [
          `${pp.participant.firstName} ${pp.participant.lastName}`,
          s.titre,
          s.date.toLocaleDateString('fr-FR'),
          `${s.heures.toString()}h`,
          `${hoursByParticipantAndSequence.get(`${pp.participantId}|${s.id}`) ?? 0}h`,
        ]),
      ),
    },
    legalMentions: [PENDING_LEGAL_REVIEW],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'CERTIFICAT_REALISATION',
    html,
    filename: `certificat-${contract.parcours.reference}-${facture.id.slice(0, 8)}.pdf`,
    parcoursId: contract.parcoursId,
    contractualisationId: contract.id,
    factureId: facture.id,
    requiresSignature: false,
  })
}

/**
 * 🔴 CONVOCATION — one per participant, covering the whole parcours
 * schedule, generated once the convention is signed. Addressed to that one
 * person; not a shared group document.
 */
export async function generateParticipantConvocation(parcoursParticipantId: string) {
  const pp = await db.parcoursParticipant.findUniqueOrThrow({
    where: { id: parcoursParticipantId },
    include: {
      participant: true,
      parcours: { include: { formationVersion: true, sequences: { orderBy: { ordre: 'asc' } } } },
      contractualisation: { select: { status: true } },
    },
  })
  if (!pp.contractualisationId || !pp.contractualisation || !isContractualisationAtLeast(pp.contractualisation.status, 'CONVENTION_SIGNEE')) {
    throw new Error('Impossible de générer la convocation : la convention doit être signée au préalable.')
  }

  const snapshot = pp.parcours.formationVersion.snapshot as unknown as FormationSnapshot
  const issuer = await getIssuer()

  const html = renderDocumentHtml({
    documentTitle: 'Convocation',
    reference: `${pp.parcours.reference}-CONVOC-${pp.id.slice(0, 8)}`,
    issuer,
    recipientLines: [`${pp.participant.firstName} ${pp.participant.lastName}`],
    metaLines: [{ label: 'formation', value: snapshot.title }],
    table: {
      headers: ['Séquence', 'Date', 'Durée', 'Lieu'],
      rows: pp.parcours.sequences.map((s) => [
        s.titre,
        s.date.toLocaleDateString('fr-FR'),
        `${s.heures.toString()}h`,
        s.visioLink ? 'Visioconférence' : [s.lieu, s.city].filter(Boolean).join(' — ') || '—',
      ]),
    },
    legalMentions: [],
    showSignatureBlock: false,
    generatedAt: new Date(),
  })

  return saveDocument({
    type: 'CONVOCATION',
    html,
    filename: `convocation-${pp.parcours.reference}-${pp.participant.lastName}.pdf`,
    parcoursId: pp.parcoursId,
    parcoursParticipantId: pp.id,
    requiresSignature: false,
  })
}

function statusForDocumentEvent(type: DocumentType, event: 'SENT' | 'SIGNED'): ProgressableStatus | null {
  if (type === 'DEVIS') return event === 'SENT' ? 'DEVIS_ENVOYE' : 'DEVIS_SIGNE'
  if (type === 'CONVENTION_DE_FORMATION' || type === 'CONTRAT_DE_FORMATION_PRO') {
    return event === 'SENT' ? 'CONVENTION_ENVOYEE' : 'CONVENTION_SIGNEE'
  }
  return null
}

async function advanceContractualisationStatus(contractualisationId: string, target: ProgressableStatus) {
  const contract = await db.contractualisation.findUnique({ where: { id: contractualisationId }, select: { status: true } })
  if (!contract) return
  const currentIndex = CONTRACTUALISATION_STATUS_ORDER.indexOf(contract.status as ProgressableStatus)
  const targetIndex = CONTRACTUALISATION_STATUS_ORDER.indexOf(target)
  if (currentIndex === -1 || targetIndex <= currentIndex) return
  await db.contractualisation.update({ where: { id: contractualisationId }, data: { status: target } })
}

export async function markDocumentSent(documentId: string) {
  const doc = await db.document.update({ where: { id: documentId }, data: { signatureStatus: 'SENT' } })
  if (doc.contractualisationId) {
    const target = statusForDocumentEvent(doc.type, 'SENT')
    if (target) await advanceContractualisationStatus(doc.contractualisationId, target)
  }
  return doc
}

/** 🔴 Mocked — no real YouSign wired. A manual toggle, clearly not a real signature capture, so nobody mistakes it for one. */
export async function markDocumentSigned(documentId: string) {
  const doc = await db.document.update({ where: { id: documentId }, data: { signatureStatus: 'SIGNED', signedAt: new Date() } })
  if (doc.contractualisationId) {
    const target = statusForDocumentEvent(doc.type, 'SIGNED')
    if (target) await advanceContractualisationStatus(doc.contractualisationId, target)
  }
  return doc
}

/** 🔴 A signed document is a legal fact — NEVER deleted, only voided. */
export async function voidDocument(documentId: string, reason: string) {
  return db.document.update({ where: { id: documentId }, data: { isVoid: true, voidReason: reason } })
}
