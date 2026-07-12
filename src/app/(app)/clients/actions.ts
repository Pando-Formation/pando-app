'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireOperational } from '@/lib/authz'
import { clientInputSchema, clientContactInputSchema } from '@/lib/validation/client'
import {
  createClient,
  updateClient,
  archiveClient,
  restoreClient,
  addClientContact,
  updateClientContact,
  toggleClientContactActive,
} from '@/lib/client'
import { lookupSiret, SireneConfigError, SireneNotFoundError, type SireneResult } from '@/lib/sirene'

export type ClientActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

function formDataToClientInput(formData: FormData) {
  return {
    companyName: String(formData.get('companyName') ?? ''),
    siret: optionalText(formData, 'siret'),
    siren: optionalText(formData, 'siren'),
    isPublicSector: formData.get('isPublicSector') === 'on',
    categorieJuridique: optionalText(formData, 'categorieJuridique'),
    nafRev2: optionalText(formData, 'nafRev2'),
    naf2025: optionalText(formData, 'naf2025'),
    nafSource: (optionalText(formData, 'nafSource') ?? 'MANUAL') as 'MANUAL' | 'SIRENE',
    address: optionalText(formData, 'address'),
    postalCode: optionalText(formData, 'postalCode'),
    city: optionalText(formData, 'city'),
    region: optionalText(formData, 'region'),
    status: (optionalText(formData, 'status') ?? 'PROSPECT') as 'PROSPECT' | 'ACTIF' | 'EN_PAUSE',
    origin: (optionalText(formData, 'origin') ?? 'DIRECT') as
      | 'DIRECT'
      | 'APPEL_OFFRE'
      | 'RESEAU'
      | 'INBOUND_SITE',
    assignedToId: optionalText(formData, 'assignedToId'),
    comments: optionalText(formData, 'comments'),
  }
}

export async function createClientAction(
  _prevState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  await requireOperational()

  const parsed = clientInputSchema.safeParse(formDataToClientInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  let clientId: string
  try {
    const client = await createClient(parsed.data)
    clientId = client.id
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/clients')
  redirect(`/clients/${clientId}`)
}

export async function updateClientAction(
  _prevState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  await requireOperational()

  const id = String(formData.get('id') ?? '')
  if (!id) return { formError: 'Client introuvable.' }

  const parsed = clientInputSchema.safeParse(formDataToClientInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateClient(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  redirect(`/clients/${id}`)
}

export async function archiveClientAction(formData: FormData) {
  await requireOperational()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await archiveClient(id)
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
}

export async function restoreClientAction(formData: FormData) {
  await requireOperational()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await restoreClient(id)
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
}

export type ContactActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function formDataToContactInput(formData: FormData) {
  return {
    roles: formData.getAll('roles').map(String),
    civilite: optionalText(formData, 'civilite'),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    fonction: optionalText(formData, 'fonction'),
    email: String(formData.get('email') ?? ''),
    phone: optionalText(formData, 'phone'),
  }
}

export async function addContactAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  await requireOperational()
  const clientId = String(formData.get('clientId') ?? '')
  if (!clientId) return { formError: 'Client introuvable.' }

  const parsed = clientContactInputSchema.safeParse(formDataToContactInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await addClientContact(clientId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function updateContactAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  await requireOperational()
  const id = String(formData.get('id') ?? '')
  const clientId = String(formData.get('clientId') ?? '')
  if (!id || !clientId) return { formError: 'Contact introuvable.' }

  const parsed = clientContactInputSchema.safeParse(formDataToContactInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateClientContact(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function toggleContactActiveAction(formData: FormData) {
  await requireOperational()
  const id = String(formData.get('id') ?? '')
  const clientId = String(formData.get('clientId') ?? '')
  const isActive = formData.get('isActive') === 'true'
  if (!id) return
  await toggleClientContactActive(id, isActive)
  revalidatePath(`/clients/${clientId}`)
}

export type SireneLookupState =
  | { ok: true; data: SireneResult }
  | { ok: false; error: string }

/** Called directly from a client component button — not a form submission. */
export async function sireneLookupAction(siret: string): Promise<SireneLookupState> {
  await requireOperational()
  try {
    const data = await lookupSiret(siret)
    return { ok: true, data }
  } catch (e) {
    if (e instanceof SireneConfigError || e instanceof SireneNotFoundError) {
      return { ok: false, error: e.message }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur SIRENE inattendue.' }
  }
}
