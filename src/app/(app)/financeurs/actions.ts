'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { financeurInputSchema } from '@/lib/validation/participant'
import { createFinanceur } from '@/lib/participant'

export type FinanceurActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

function optionalText(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return v === null || v === '' ? null : String(v)
}

export async function createFinanceurAction(
  _prevState: FinanceurActionState,
  formData: FormData,
): Promise<FinanceurActionState> {
  await requireAdmin()

  const parsed = financeurInputSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    siret: optionalText(formData, 'siret'),
    type: optionalText(formData, 'type'),
    contactEmail: optionalText(formData, 'contactEmail'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    await createFinanceur(parsed.data)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath('/financeurs')
  return null
}
