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

/**
 * 🔴 One participant, one message — not a parcours-wide broadcast. The old
 * per-séquence version of this function bulk-`updateMany`d convocationStatus
 * across every participant of the parcours regardless of who was actually
 * being sent to; this version updates exactly the one row it sent to.
 */
export async function sendParticipantConvocation(parcoursParticipantId: string) {
  const pp = await db.parcoursParticipant.findUniqueOrThrow({
    where: { id: parcoursParticipantId },
    include: { participant: true },
  })
  const batch = await getOrCreateConvocationBatch(pp.parcoursId)

  const now = new Date()
  const [message] = await db.$transaction([
    db.communicationMessage.create({
      data: {
        sequenceId: batch.id,
        recipientEmail: pp.participant.email,
        subject: 'Convocation — parcours',
        body: `Vous êtes convoqué·e aux séquences de votre parcours de formation. Vous trouverez le calendrier complet en pièce jointe.`,
        scheduledFor: now,
        sentAt: now,
        deliveryStatus: 'SENT',
      },
    }),
    db.parcoursParticipant.update({ where: { id: parcoursParticipantId }, data: { convocationStatus: 'SENT' } }),
  ])

  return message
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
