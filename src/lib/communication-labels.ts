export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  SENT: 'Envoyé — non confirmé',
  DELIVERED: 'Livré',
  SOFT_BOUNCE: 'Bounce doux — nouvelle tentative',
  HARD_BOUNCE: 'ÉCHEC — adresse invalide',
  BLOCKED: 'Bloqué',
  SPAM: 'Signalé comme spam',
  OPENED: 'Ouvert',
}

/**
 * 🔴 THE RULE THIS SLICE EXISTS TO ENFORCE: DELIVERED (or OPENED) is the
 * only green state — it is the proof, nothing else is. HARD_BOUNCE is
 * always red, never a tick. Everything else that hasn't been confirmed
 * delivered is amber, including a plain SENT with no webhook yet.
 */
export function deliveryStatusBadgeClass(status: string): string {
  if (status === 'DELIVERED' || status === 'OPENED') return 'badge-success'
  if (status === 'HARD_BOUNCE' || status === 'BLOCKED' || status === 'SPAM') return 'badge-danger'
  if (status === 'SOFT_BOUNCE' || status === 'SENT') return 'badge-warning'
  return 'badge-neutral'
}
