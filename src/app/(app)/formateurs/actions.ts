'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { formateurInputSchema, competenceInputSchema } from '@/lib/validation/formateur'
import { createFormateur, updateFormateur, archiveFormateur, restoreFormateur, addCompetence } from '@/lib/formateur'

export type FormateurActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

function formDataToFormateurInput(formData: FormData) {
  return {
    civilite: optionalText(formData, 'civilite') as 'MADAME' | 'MONSIEUR' | 'AUTRE' | null,
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: optionalText(formData, 'phone'),
    address: optionalText(formData, 'address'),
    postalCode: optionalText(formData, 'postalCode'),
    city: optionalText(formData, 'city'),
    contractType: String(formData.get('contractType') ?? '') as
      | 'INTERNE_DIRIGEANT'
      | 'INTERNE_SALARIE'
      | 'EXTERNE_PRESTATAIRE',
    siren: optionalText(formData, 'siren'),
    nda: optionalText(formData, 'nda'),
    tvaRate: String(formData.get('tvaRate') ?? '0'),
    tarifJour: optionalText(formData, 'tarifJour'),
    forfaitDeplacement: optionalText(formData, 'forfaitDeplacement') ?? '0',
    isQualiopiCertified: formData.get('isQualiopiCertified') === 'on',
    expertises: JSON.parse(String(formData.get('expertises') ?? '[]')),
    yearsFormation: optionalText(formData, 'yearsFormation'),
    yearsManagement: optionalText(formData, 'yearsManagement'),
    availabilityNotes: optionalText(formData, 'availabilityNotes'),
  }
}

export async function createFormateurAction(
  _prevState: FormateurActionState,
  formData: FormData,
): Promise<FormateurActionState> {
  await requireAdmin()

  const parsed = formateurInputSchema.safeParse(formDataToFormateurInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  let formateurId: string
  try {
    const formateur = await createFormateur(parsed.data)
    formateurId = formateur.id
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/formateurs')
  redirect(`/formateurs/${formateurId}`)
}

export async function updateFormateurAction(
  _prevState: FormateurActionState,
  formData: FormData,
): Promise<FormateurActionState> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { formError: 'Formateur introuvable.' }

  const parsed = formateurInputSchema.safeParse(formDataToFormateurInput(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await updateFormateur(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/formateurs')
  revalidatePath(`/formateurs/${id}`)
  redirect(`/formateurs/${id}`)
}

export async function archiveFormateurAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await archiveFormateur(id)
  revalidatePath('/formateurs')
  revalidatePath(`/formateurs/${id}`)
}

export async function restoreFormateurAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await restoreFormateur(id)
  revalidatePath('/formateurs')
  revalidatePath(`/formateurs/${id}`)
}

export type CompetenceActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

export async function addCompetenceAction(
  _prevState: CompetenceActionState,
  formData: FormData,
): Promise<CompetenceActionState> {
  await requireAdmin()
  const formateurId = String(formData.get('formateurId') ?? '')
  if (!formateurId) return { formError: 'Formateur introuvable.' }

  const parsed = competenceInputSchema.safeParse({
    type: String(formData.get('type') ?? ''),
    title: String(formData.get('title') ?? ''),
    date: String(formData.get('date') ?? ''),
    expiresAt: optionalText(formData, 'expiresAt'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await addCompetence(formateurId, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/formateurs/${formateurId}`)
  redirect(`/formateurs/${formateurId}`)
}
