'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, updateParcours, addSequence, updateSequence, deleteSequence } from '@/lib/parcours'

export type ParcoursActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

function formDataToParcoursInput(formData: FormData) {
  return {
    reference: String(formData.get('reference') ?? ''),
    formationId: String(formData.get('formationId') ?? ''),
    pandoRole: String(formData.get('pandoRole') ?? 'PRESTATAIRE_DIRECT'),
    track: String(formData.get('track') ?? 'INTRA'),
    status: String(formData.get('status') ?? 'BROUILLON'),
    clientId: optionalText(formData, 'clientId'),
    beneficiaireId: optionalText(formData, 'beneficiaireId'),
    donneurOrdreId: optionalText(formData, 'donneurOrdreId'),
    minParticipants: optionalText(formData, 'minParticipants'),
    maxParticipants: optionalText(formData, 'maxParticipants'),
    delaiReglement: optionalText(formData, 'delaiReglement') ?? '30',
    cancellationReason: optionalText(formData, 'cancellationReason'),
  }
}

export async function createParcoursAction(
  _prevState: ParcoursActionState,
  formData: FormData,
): Promise<ParcoursActionState> {
  await requireAdmin()

  const parsed = parcoursInputSchema.safeParse(formDataToParcoursInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  let parcoursId: string
  try {
    const parcours = await createParcours(parsed.data)
    parcoursId = parcours.id
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/parcours')
  redirect(`/parcours/${parcoursId}`)
}

export async function updateParcoursAction(
  _prevState: ParcoursActionState,
  formData: FormData,
): Promise<ParcoursActionState> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { formError: 'Parcours introuvable.' }

  // formationId is not editable — the form doesn't submit it, and
  // updateParcours never touches formationVersionId regardless.
  const parsed = parcoursInputSchema.safeParse({ ...formDataToParcoursInput(formData), formationId: 'unused' })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateParcours(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/parcours')
  revalidatePath(`/parcours/${id}`)
  redirect(`/parcours/${id}`)
}

export type SequenceActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function formDataToSequenceInput(formData: FormData) {
  return {
    ordre: optionalText(formData, 'ordre') ?? '1',
    titre: String(formData.get('titre') ?? ''),
    type: String(formData.get('type') ?? 'PRESENTIEL'),
    date: String(formData.get('date') ?? ''),
    demiJournees: formData.getAll('demiJournees').map(String),
    heures: String(formData.get('heures') ?? ''),
    lieu: optionalText(formData, 'lieu'),
    preuveType: String(formData.get('preuveType') ?? 'SIGNATURE'),
    formateurId: optionalText(formData, 'formateurId'),
  }
}

export async function addSequenceAction(
  _prevState: SequenceActionState,
  formData: FormData,
): Promise<SequenceActionState> {
  await requireAdmin()
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!parcoursId) return { formError: 'Parcours introuvable.' }

  const parsed = sequenceInputSchema.safeParse(formDataToSequenceInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await addSequence(parcoursId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}`)
}

export async function updateSequenceAction(
  _prevState: SequenceActionState,
  formData: FormData,
): Promise<SequenceActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id || !parcoursId) return { formError: 'Séquence introuvable.' }

  const parsed = sequenceInputSchema.safeParse(formDataToSequenceInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateSequence(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}`)
}

export async function deleteSequenceAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return
  await deleteSequence(id)
  revalidatePath(`/parcours/${parcoursId}`)
}
