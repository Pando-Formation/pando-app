import { db } from '@/lib/db'
import { isContractualisationAtLeast } from '@/lib/participant-labels'

function assertNotCancelled(status: string) {
  if (status === 'ANNULEE') throw new Error('Impossible de facturer : cette contractualisation est annulée.')
}

/** Past, not-yet-invoiced sequences of the contractualisation's parcours — the pool a new Facture can draw from. */
export async function listInvoiceableSequences(contractualisationId: string) {
  const contract = await db.contractualisation.findUniqueOrThrow({ where: { id: contractualisationId }, select: { parcoursId: true } })
  return db.sequence.findMany({
    where: { parcoursId: contract.parcoursId, factureId: null, date: { lte: new Date() } },
    orderBy: { ordre: 'asc' },
  })
}

/**
 * 🔴 Both the sequences covered and the montant are hand-chosen by the
 * admin, never computed — invoicing happens progressively (typically
 * monthly) as sequences are delivered, not as one lump sum.
 */
export async function createFacture(
  contractualisationId: string,
  input: { sequenceIds: string[]; montantHT: number },
) {
  const contract = await db.contractualisation.findUniqueOrThrow({ where: { id: contractualisationId } })
  assertNotCancelled(contract.status)
  if (!isContractualisationAtLeast(contract.status, 'CONVENTION_SIGNEE')) {
    throw new Error('Impossible de créer une facture : la convention doit être signée au préalable.')
  }
  if (input.sequenceIds.length === 0) {
    throw new Error('Impossible de créer une facture : sélectionnez au moins une séquence.')
  }

  const invoiceable = await listInvoiceableSequences(contractualisationId)
  const invoiceableIds = new Set(invoiceable.map((s) => s.id))
  if (!input.sequenceIds.every((id) => invoiceableIds.has(id))) {
    throw new Error('Une ou plusieurs séquences sélectionnées ne sont plus disponibles à la facturation.')
  }

  return db.$transaction(async (tx) => {
    const facture = await tx.facture.create({ data: { contractualisationId, montantHT: input.montantHT } })
    await tx.sequence.updateMany({ where: { id: { in: input.sequenceIds } }, data: { factureId: facture.id } })
    return facture
  })
}

export async function markFactureSent(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({ where: { id: factureId }, include: { documents: { where: { isVoid: false } } } })
  if (facture.documents.length === 0) {
    throw new Error('Impossible de marquer envoyée : la facture doit être générée au préalable.')
  }
  return db.facture.update({ where: { id: factureId }, data: { sentAt: facture.sentAt ?? new Date() } })
}

/** A Chorus Pro send counts as "sent" too — it doesn't also need a separate manual "Marquer envoyée". */
export async function markFactureChorusProSent(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({
    where: { id: factureId },
    include: { contractualisation: { include: { payerClient: true } }, documents: { where: { isVoid: false } } },
  })
  if (facture.documents.length === 0) {
    throw new Error('Impossible de marquer envoyée : la facture doit être générée au préalable.')
  }
  if (!facture.contractualisation.payerClient?.isPublicSector) {
    throw new Error('Chorus Pro ne concerne que les payeurs du secteur public.')
  }
  const now = new Date()
  return db.facture.update({ where: { id: factureId }, data: { chorusProSentAt: now, sentAt: facture.sentAt ?? now } })
}

export async function markFacturePaid(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({ where: { id: factureId }, select: { sentAt: true } })
  if (!facture.sentAt) {
    throw new Error('Impossible de marquer payée : la facture doit être envoyée au préalable.')
  }
  return db.facture.update({ where: { id: factureId }, data: { paidAt: new Date() } })
}

/** Only a draft (no generated document yet) can be deleted — frees its sequences back up for future invoicing. */
export async function deleteFacture(factureId: string) {
  const facture = await db.facture.findUniqueOrThrow({ where: { id: factureId }, include: { documents: { where: { isVoid: false } } } })
  if (facture.documents.length > 0) {
    throw new Error('Impossible de supprimer : cette facture a déjà été générée.')
  }
  await db.$transaction([
    db.sequence.updateMany({ where: { factureId }, data: { factureId: null } }),
    db.facture.delete({ where: { id: factureId } }),
  ])
}
