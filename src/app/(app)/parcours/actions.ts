'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { parcoursInputSchema, sequenceInputSchema } from '@/lib/validation/parcours'
import { createParcours, updateParcours, addSequence, updateSequence, deleteSequence } from '@/lib/parcours'
import {
  contractualisationInputSchema,
  financementInputSchema,
  enrollParticipantInputSchema,
  parcoursParticipantInputSchema,
} from '@/lib/validation/participant'
import {
  createContractualisation,
  updateContractualisation,
  cancelContractualisation,
  addFinancement,
  updateFinancement,
  deleteFinancement,
  enrollParticipant,
  updateParcoursParticipant,
} from '@/lib/participant'
import { toCents } from '@/lib/money'

function parseEuros(raw: FormDataEntryValue | null): string {
  const s = String(raw ?? '').trim()
  if (!s) return '0'
  const n = Number(s)
  return String(Number.isNaN(n) ? 0 : toCents(n))
}

/** Unlike parseEuros, blank stays blank — 0€ and "not priced at all" must stay distinguishable. */
function parseOptionalEuros(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return String(Number.isNaN(n) ? 0 : toCents(n))
}

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
    titre: String(formData.get('titre') ?? ''),
    type: String(formData.get('type') ?? 'PRESENTIEL'),
    date: String(formData.get('date') ?? ''),
    demiJournees: formData.getAll('demiJournees').map(String),
    heures: String(formData.get('heures') ?? ''),
    montantHT: parseOptionalEuros(formData.get('montantHT')),
    lieu: optionalText(formData, 'lieu'),
    address: optionalText(formData, 'address'),
    postalCode: optionalText(formData, 'postalCode'),
    city: optionalText(formData, 'city'),
    visioLink: optionalText(formData, 'visioLink'),
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
  redirect(`/parcours/${parcoursId}?tab=sequences`)
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
  redirect(`/parcours/${parcoursId}?tab=sequences`)
}

export async function deleteSequenceAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return
  await deleteSequence(id)
  revalidatePath(`/parcours/${parcoursId}`)
}

export type ContractualisationActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function formDataToContractualisationInput(formData: FormData) {
  return {
    payerType: String(formData.get('payerType') ?? 'ORGANISATION'),
    payerId: String(formData.get('payerId') ?? ''),
    delaiReglement: optionalText(formData, 'delaiReglement'),
    numeroEngagement: optionalText(formData, 'numeroEngagement'),
    codeService: optionalText(formData, 'codeService'),
  }
}

export async function createContractualisationAction(
  _prevState: ContractualisationActionState,
  formData: FormData,
): Promise<ContractualisationActionState> {
  await requireAdmin()
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!parcoursId) return { formError: 'Parcours introuvable.' }

  const parsed = contractualisationInputSchema.safeParse(formDataToContractualisationInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await createContractualisation(parcoursId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=contractualisations`)
}

export async function updateContractualisationAction(
  _prevState: ContractualisationActionState,
  formData: FormData,
): Promise<ContractualisationActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return { formError: 'Contractualisation introuvable.' }

  const parsed = contractualisationInputSchema.safeParse(formDataToContractualisationInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateContractualisation(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=contractualisations`)
}

export async function cancelContractualisationAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return
  await cancelContractualisation(id)
  revalidatePath(`/parcours/${parcoursId}`)
}

export type FinancementActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function formDataToFinancementInput(formData: FormData) {
  return {
    type: String(formData.get('type') ?? 'AUTRE'),
    financeurId: optionalText(formData, 'financeurId'),
    dossierNumber: optionalText(formData, 'dossierNumber'),
    montantPrisEnCharge: parseEuros(formData.get('montantPrisEnCharge')),
  }
}

export async function addFinancementAction(
  _prevState: FinancementActionState,
  formData: FormData,
): Promise<FinancementActionState> {
  await requireAdmin()
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!contractualisationId || !parcoursId) return { formError: 'Contractualisation introuvable.' }

  const parsed = financementInputSchema.safeParse(formDataToFinancementInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await addFinancement(contractualisationId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=contractualisations`)
}

export async function updateFinancementAction(
  _prevState: FinancementActionState,
  formData: FormData,
): Promise<FinancementActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id || !parcoursId) return { formError: 'Financement introuvable.' }

  const parsed = financementInputSchema.safeParse(formDataToFinancementInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateFinancement(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=contractualisations`)
}

export async function deleteFinancementAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return
  await deleteFinancement(id)
  revalidatePath(`/parcours/${parcoursId}`)
}

export type EnrollActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

export async function enrollParticipantAction(
  _prevState: EnrollActionState,
  formData: FormData,
): Promise<EnrollActionState> {
  await requireAdmin()
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!parcoursId) return { formError: 'Parcours introuvable.' }

  const parsed = enrollParticipantInputSchema.safeParse({
    participantId: String(formData.get('participantId') ?? ''),
    contractualisationId: optionalText(formData, 'contractualisationId'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await enrollParticipant(parcoursId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=participants`)
}

export type ParcoursParticipantActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

export async function updateParcoursParticipantAction(
  _prevState: ParcoursParticipantActionState,
  formData: FormData,
): Promise<ParcoursParticipantActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!id) return { formError: 'Inscription introuvable.' }

  const parsed = parcoursParticipantInputSchema.safeParse({
    status: String(formData.get('status') ?? 'INSCRIT'),
    abandonReason: optionalText(formData, 'abandonReason'),
    besoinAccessibilite: optionalText(formData, 'besoinAccessibilite'),
    adaptationProposee: optionalText(formData, 'adaptationProposee'),
    traceResponse: formData.get('traceResponse') === 'on',
    referentHandicapId: optionalText(formData, 'referentHandicapId'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateParcoursParticipant(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=participants`)
}
