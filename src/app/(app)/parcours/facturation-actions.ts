'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { createFacture, markFactureSent, markFactureChorusProSent, markFacturePaid, deleteFacture } from '@/lib/facturation'
import { generateFactureDocument, generateFactureCertificat } from '@/lib/document'
import { toCents } from '@/lib/money'

export type FactureActionState = { formError?: string; fieldErrors?: Record<string, string[]> } | null
export type DocumentActionState = { error?: string } | null

async function runGeneration(parcoursId: string, fn: () => Promise<unknown>): Promise<DocumentActionState> {
  await requireAdmin()
  try {
    await fn()
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }
  revalidatePath(`/parcours/${parcoursId}`)
  return null
}

export async function createFactureAction(_prev: FactureActionState, formData: FormData): Promise<FactureActionState> {
  await requireAdmin()
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  const montantEuros = Number(formData.get('montantHT') ?? 0)
  const sequenceIds = formData.getAll('sequenceIds').map(String)

  if (!sequenceIds.length) {
    return { fieldErrors: { sequenceIds: ['Sélectionnez au moins une séquence.'] } }
  }
  if (!Number.isFinite(montantEuros) || montantEuros <= 0) {
    return { fieldErrors: { montantHT: ['Montant requis.'] } }
  }

  try {
    await createFacture(contractualisationId, { sequenceIds, montantHT: toCents(montantEuros) })
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}`)
  redirect(`/parcours/${parcoursId}?tab=facturation`)
}

export async function generateFactureDocumentAction(_prev: DocumentActionState, formData: FormData) {
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateFactureDocument(factureId))
}

export async function generateFactureCertificatAction(_prev: DocumentActionState, formData: FormData) {
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateFactureCertificat(factureId))
}

export async function markFactureSentAction(_prev: DocumentActionState, formData: FormData) {
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => markFactureSent(factureId))
}

export async function markFactureChorusProSentAction(_prev: DocumentActionState, formData: FormData) {
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => markFactureChorusProSent(factureId))
}

export async function markFacturePaidAction(_prev: DocumentActionState, formData: FormData) {
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => markFacturePaid(factureId))
}

export async function deleteFactureAction(formData: FormData) {
  await requireAdmin()
  const factureId = String(formData.get('factureId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!factureId) return
  await deleteFacture(factureId)
  revalidatePath(`/parcours/${parcoursId}`)
}
