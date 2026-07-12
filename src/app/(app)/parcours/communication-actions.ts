'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { sendConvocations, simulateDelivery } from '@/lib/communication'

export async function sendConvocationsAction(formData: FormData) {
  await requireAdmin()
  const sequenceId = String(formData.get('sequenceId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!sequenceId) return
  await sendConvocations(sequenceId)
  revalidatePath(`/parcours/${parcoursId}`)
}

export async function simulateDeliveryAction(formData: FormData) {
  await requireAdmin()
  const messageId = String(formData.get('messageId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  const outcome = String(formData.get('outcome') ?? '')
  if (!messageId || !['DELIVERED', 'HARD_BOUNCE', 'SOFT_BOUNCE', 'OPENED'].includes(outcome)) return
  await simulateDelivery(messageId, outcome as 'DELIVERED' | 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'OPENED')
  revalidatePath(`/parcours/${parcoursId}`)
}
