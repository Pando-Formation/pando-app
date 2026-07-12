'use server'

import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/authz'
import { formationInputSchema } from '@/lib/validation/formation'
import { createFormationWithVersion, updateFormationWithVersion, toggleFormationActive } from '@/lib/formation'
import { toCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

export type FormationActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function parseEuros(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (Number.isNaN(n)) return null
  return toCents(n)
}

function formDataToInput(formData: FormData) {
  const objectivesRaw = String(formData.get('pedagogicObjectives') ?? '[]')
  let pedagogicObjectives: string[] = []
  try {
    pedagogicObjectives = JSON.parse(objectivesRaw)
  } catch {
    pedagogicObjectives = []
  }

  const optionalText = (name: string) => {
    const v = formData.get(name)
    return v === null || v === '' ? null : String(v)
  }
  const optionalEnum = (name: string) => {
    const v = formData.get(name)
    return v === null || v === '' ? null : String(v)
  }

  return {
    internalCode: String(formData.get('internalCode') ?? ''),
    title: String(formData.get('title') ?? ''),
    subtitle: optionalText('subtitle'),
    brandProgramme: optionalEnum('brandProgramme') as 'BAM' | 'POP' | 'CLIC' | 'WOW' | null,
    requiresFullCohort: formData.get('requiresFullCohort') === 'on',
    intraOnly: formData.get('intraOnly') === 'on',
    durationHours: String(formData.get('durationHours') ?? ''),
    durationDays: String(formData.get('durationDays') ?? ''),
    format: String(formData.get('format') ?? '') as
      | 'PRESENTIEL'
      | 'DISTANCIEL'
      | 'ELEARNING'
      | 'PRESENTIEL_DISTANCIEL'
      | 'PRESENTIEL_ELEARNING'
      | 'DISTANCIEL_ELEARNING'
      | 'MIXTE_COMPLET',
    prerequisites: String(formData.get('prerequisites') ?? ''),
    targetAudience: String(formData.get('targetAudience') ?? ''),
    pedagogicObjectives,
    methodesPedagogiques: optionalText('methodesPedagogiques'),
    modalitesEvaluation: optionalText('modalitesEvaluation'),
    delaiAcces: String(formData.get('delaiAcces') ?? ''),
    accessibilite: String(formData.get('accessibilite') ?? ''),
    priceIntraPerDay: parseEuros(formData.get('priceIntraPerDay')),
    priceInterPerPerson: parseEuros(formData.get('priceInterPerPerson')),
    bpfIncluded: formData.get('bpfIncluded') === 'on',
    prestationCode: optionalEnum('prestationCode') as
      | 'DIPLOME'
      | 'CERTIFICATION'
      | 'CQP_NON_ENREGISTRE'
      | 'AUTRE_ACTION_FORMATION'
      | 'BILAN_COMPETENCES'
      | 'VAE'
      | null,
    specialiteId: optionalText('specialiteId'),
  }
}

export async function createFormationAction(
  _prevState: FormationActionState,
  formData: FormData,
): Promise<FormationActionState> {
  await requireSuperAdmin()

  const parsed = formationInputSchema.safeParse(formDataToInput(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  let formationId: string
  try {
    const formation = await createFormationWithVersion(parsed.data)
    formationId = formation.id
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/catalogue/formations')
  redirect(`/catalogue/formations/${formationId}`)
}

export async function updateFormationAction(
  _prevState: FormationActionState,
  formData: FormData,
): Promise<FormationActionState> {
  await requireSuperAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { formError: 'Formation introuvable.' }

  const parsed = formationInputSchema.safeParse(formDataToInput(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await updateFormationWithVersion(id, parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/catalogue/formations')
  revalidatePath(`/catalogue/formations/${id}`)
  redirect(`/catalogue/formations/${id}`)
}

export async function archiveFormationAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await toggleFormationActive(id, false)
  revalidatePath('/catalogue/formations')
  revalidatePath(`/catalogue/formations/${id}`)
}

export async function restoreFormationAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await toggleFormationActive(id, true)
  revalidatePath('/catalogue/formations')
  revalidatePath(`/catalogue/formations/${id}`)
}
