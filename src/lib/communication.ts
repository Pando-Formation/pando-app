import { db } from '@/lib/db'

/**
 * 🔴 Sending is MOCKED for this build — no real Brevo account/webhook
 * endpoint is wired (would need a public URL Brevo can reach; not available
 * from local dev). sendConvocations() creates the real CommunicationMessage
 * rows a genuine send would produce; simulateDelivery() plays the role a
 * Brevo webhook would play, so the delivery-status UI states (the actual
 * point of this slice) are demoable and testable without a live integration.
 *
 * THE RULE THIS SLICE EXISTS TO ENFORCE, unaffected by the mock: a
 * HARD_BOUNCE is never DELIVERED, and nothing renders green until DELIVERED
 * (or OPENED) is set. See src/lib/communication-labels.ts for the UI mapping.
 */
const CONVOCATION_TEMPLATE_NAME = 'Convocations (envoi manuel)'

/**
 * CommunicationMessage has no direct FK to a training Sequence or Parcours —
 * only to CommunicationSequence (the arbitrary nudge-scheduling engine).
 * Reuse that real relation rather than inventing a new column: one
 * CommunicationTemplate for manual convocation sends, one CommunicationSequence
 * per parcours, found-or-created idempotently.
 */
async function getOrCreateConvocationBatch(parcoursId: string) {
  let template = await db.communicationTemplate.findFirst({ where: { name: CONVOCATION_TEMPLATE_NAME } })
  if (!template) {
    template = await db.communicationTemplate.create({ data: { name: CONVOCATION_TEMPLATE_NAME, messages: [] } })
  }
  let batch = await db.communicationSequence.findFirst({ where: { parcoursId, templateId: template.id } })
  if (!batch) {
    batch = await db.communicationSequence.create({ data: { parcoursId, templateId: template.id } })
  }
  return batch
}

export async function sendConvocations(sequenceId: string) {
  const sequence = await db.sequence.findUniqueOrThrow({
    where: { id: sequenceId },
    include: { parcours: { include: { participants: { include: { participant: true } } } } },
  })
  const batch = await getOrCreateConvocationBatch(sequence.parcoursId)

  const now = new Date()
  const created = await db.$transaction(
    sequence.parcours.participants.map((pp) =>
      db.communicationMessage.create({
        data: {
          sequenceId: batch.id,
          recipientEmail: pp.participant.email,
          subject: `Convocation — ${sequence.titre}`,
          body: `Vous êtes convoqué·e à la séquence "${sequence.titre}" le ${sequence.date.toLocaleDateString('fr-FR')}.`,
          scheduledFor: now,
          sentAt: now,
          deliveryStatus: 'SENT',
        },
      }),
    ),
  )

  // Each ParcoursParticipant tracks its own convocationStatus (Slice 5's
  // per-participant state machine) — mirror the send here.
  await db.parcoursParticipant.updateMany({
    where: { id: { in: sequence.parcours.participants.map((pp) => pp.id) } },
    data: { convocationStatus: 'SENT' },
  })

  return created
}

type SimulatedOutcome = 'DELIVERED' | 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'OPENED'

/** 🔴 Simulates what a Brevo delivery webhook would report. Never called by real code — only by the "simulate" buttons in the UI, clearly labeled as such. */
export async function simulateDelivery(messageId: string, outcome: SimulatedOutcome) {
  const message = await db.communicationMessage.findUniqueOrThrow({ where: { id: messageId } })
  const now = new Date()

  if (outcome === 'SOFT_BOUNCE') {
    // 🔴 Soft bounce → auto-retry ×2 over 24h → THEN escalate to HARD_BOUNCE.
    // Never DELIVERED, never silently dropped.
    if (message.retryCount < 2) {
      return db.communicationMessage.update({
        where: { id: messageId },
        data: { deliveryStatus: 'SOFT_BOUNCE', bouncedAt: now, retryCount: { increment: 1 } },
      })
    }
    return db.communicationMessage.update({
      where: { id: messageId },
      data: { deliveryStatus: 'HARD_BOUNCE', bouncedAt: now },
    })
  }

  if (outcome === 'HARD_BOUNCE') {
    return db.communicationMessage.update({ where: { id: messageId }, data: { deliveryStatus: 'HARD_BOUNCE', bouncedAt: now } })
  }

  // DELIVERED or OPENED
  return db.communicationMessage.update({
    where: { id: messageId },
    data: { deliveryStatus: outcome, deliveredAt: now },
  })
}
