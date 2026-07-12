'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireOperational } from '@/lib/authz'
import { participantInputSchema } from '@/lib/validation/participant'
import { createParticipant, updateParticipant } from '@/lib/participant'

export type ParticipantActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

function formDataToParticipantInput(formData: FormData) {
  return {
    civilite: optionalText(formData, 'civilite'),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: optionalText(formData, 'address'),
    postalCode: optionalText(formData, 'postalCode'),
    city: optionalText(formData, 'city'),
    fonction: optionalText(formData, 'fonction'),
    situation: String(formData.get('situation') ?? 'SALARIE'),
    clientId: optionalText(formData, 'clientId'),
  }
}

export async function createParticipantAction(
  _prevState: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  await requireOperational()

  const parsed = participantInputSchema.safeParse(formDataToParticipantInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  let participantId: string
  try {
    const participant = await createParticipant(parsed.data)
    participantId = participant.id
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/participants')
  redirect(`/participants/${participantId}`)
}

export async function updateParticipantAction(
  _prevState: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  await requireOperational()

  const id = String(formData.get('id') ?? '')
  if (!id) return { formError: 'Participant introuvable.' }

  const parsed = participantInputSchema.safeParse(formDataToParticipantInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateParticipant(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/participants')
  revalidatePath(`/participants/${id}`)
  redirect(`/participants/${id}`)
}
