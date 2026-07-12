'use server'

import { revalidatePath } from 'next/cache'
import { requireOperational } from '@/lib/authz'
import {
  reclamationInputSchema,
  reclamationResponseInputSchema,
  actionInputSchema,
  actionOutcomeInputSchema,
  veilleInputSchema,
} from '@/lib/validation/amelioration'
import { createReclamation, respondToReclamation, createAction, resolveAction, createVeille } from '@/lib/amelioration'

export type AmeliorationActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

export async function createReclamationAction(
  _prevState: AmeliorationActionState,
  formData: FormData,
): Promise<AmeliorationActionState> {
  await requireOperational()
  const parsed = reclamationInputSchema.safeParse({
    source: String(formData.get('source') ?? 'AUTRE'),
    receivedAt: String(formData.get('receivedAt') ?? ''),
    receivedVia: optionalText(formData, 'receivedVia'),
    description: String(formData.get('description') ?? ''),
    qualification: optionalText(formData, 'qualification'),
    confidentiality: String(formData.get('confidentiality') ?? 'INTERNE'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  await createReclamation(parsed.data)
  revalidatePath('/amelioration')
  return null
}

export async function respondReclamationAction(formData: FormData) {
  await requireOperational()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const parsed = reclamationResponseInputSchema.safeParse({
    responseText: String(formData.get('responseText') ?? ''),
    close: formData.get('close') === 'on',
  })
  if (!parsed.success) return
  await respondToReclamation(id, parsed.data)
  revalidatePath('/amelioration')
}

export async function createActionAction(
  _prevState: AmeliorationActionState,
  formData: FormData,
): Promise<AmeliorationActionState> {
  await requireOperational()
  const parsed = actionInputSchema.safeParse({
    origin: String(formData.get('origin') ?? 'INTERNE'),
    description: String(formData.get('description') ?? ''),
    ownerId: String(formData.get('ownerId') ?? ''),
    dueDate: String(formData.get('dueDate') ?? ''),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  await createAction(parsed.data)
  revalidatePath('/amelioration')
  return null
}

export async function resolveActionAction(formData: FormData) {
  const session = await requireOperational()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const parsed = actionOutcomeInputSchema.safeParse({ outcome: String(formData.get('outcome') ?? '') })
  if (!parsed.success) return
  await resolveAction(id, parsed.data, session.user.id)
  revalidatePath('/amelioration')
}

export async function createVeilleAction(
  _prevState: AmeliorationActionState,
  formData: FormData,
): Promise<AmeliorationActionState> {
  const session = await requireOperational()
  const parsed = veilleInputSchema.safeParse({
    type: String(formData.get('type') ?? 'METIER'),
    source: String(formData.get('source') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    soWhat: String(formData.get('soWhat') ?? ''),
    date: String(formData.get('date') ?? ''),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  await createVeille(parsed.data, session.user.id)
  revalidatePath('/amelioration')
  return null
}
